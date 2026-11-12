-- Patients come from the Nutrition Registration service (program enrollment), the same way the
-- other service-based reports resolve services - NOT from the (retired) CMAM form. Their
-- attributes are each patient's latest recorded value from any encounter, which in practice is
-- the Nutrition Assessment section in Care Services.
-- Counterpart: cmam_summary_report_above5.sql (identical apart from the age condition). Drill-down:
-- cmam_patients_for_category.sql, which must bucket patients exactly the same way.
WITH nutrition_enrollments AS (
  SELECT pp.patient_id, pp.location_id,
    ROW_NUMBER() OVER (PARTITION BY pp.patient_id ORDER BY pp.date_enrolled DESC, pp.patient_program_id DESC) AS rn
  FROM patient_program pp
  WHERE pp.voided = 0
    AND pp.program_id = (SELECT program_id FROM program WHERE uuid = '2433ebba-8ffb-11f1-a103-1afee95a890c')
    -- Enrollment overlaps the report period (same overlap rule as patient_encounter_summary.sql).
    AND (:startDate IS NULL OR pp.date_completed IS NULL OR pp.date_completed >= :startDate)
    AND (:endDate IS NULL OR pp.date_enrolled < DATE_ADD(:endDate, INTERVAL 1 DAY))
),
-- Age band by current age (same as the Nutrition Child Under 5 / Above 5 reports, so a patient
-- lands in the same band in both). Location = the patient's most recent Nutrition enrollment.
cmam_patients AS (
  SELECT ne.patient_id
  FROM nutrition_enrollments ne
  JOIN person p ON p.person_id = ne.patient_id AND p.voided = 0
  WHERE ne.rn = 1
    AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) < 5
    AND (:locationUuid IS NULL OR ne.location_id = (SELECT location_id FROM location WHERE uuid = :locationUuid))
),
-- Current Diagnosis: the latest of the service's free-text Nutrition Diagnosis (6d4f0916) and the
-- old CMAM form's coded Current Diagnosis (51d873b5), normalized to SAM / MAM / Normal /
-- Malnourished (the over-5 MUAC classification). Anything else is bucketed as 'Other'.
latest_diagnosis AS (
  SELECT patient_id, label FROM (
    SELECT o.person_id AS patient_id,
      CASE
        WHEN c.uuid = '51d873b5-3394-4780-87d3-5bfaf5cf0eb8' THEN COALESCE(vcn.name, 'Other')
        WHEN o.value_text LIKE '%SAM%' OR o.value_text LIKE '%Severe%' THEN 'SAM'
        WHEN o.value_text LIKE '%MAM%' OR o.value_text LIKE '%Moderate%' THEN 'MAM'
        WHEN o.value_text LIKE '%Malnourished%' THEN 'Malnourished'
        WHEN o.value_text LIKE '%Normal%' THEN 'Normal'
        ELSE 'Other'
      END AS label,
      ROW_NUMBER() OVER (PARTITION BY o.person_id ORDER BY o.obs_datetime DESC, o.obs_id DESC) AS rn
    FROM obs o
    JOIN concept c ON c.concept_id = o.concept_id
    JOIN cmam_patients cp ON cp.patient_id = o.person_id
    LEFT JOIN concept_name vcn ON vcn.concept_id = o.value_coded AND vcn.locale = 'en' AND vcn.locale_preferred = 1
    WHERE o.voided = 0
      AND c.uuid IN ('6d4f0916-5913-4e48-82ea-265e379ffb6b', '51d873b5-3394-4780-87d3-5bfaf5cf0eb8')
      AND (:endDate IS NULL OR o.obs_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  ) ranked
  WHERE rn = 1
),
-- Child Last Status (Under F/U / Cured / Defaulter / Death / Transferred): latest recorded value.
latest_status AS (
  SELECT patient_id, value_coded FROM (
    SELECT o.person_id AS patient_id, o.value_coded,
      ROW_NUMBER() OVER (PARTITION BY o.person_id ORDER BY o.obs_datetime DESC, o.obs_id DESC) AS rn
    FROM obs o
    JOIN cmam_patients cp ON cp.patient_id = o.person_id
    WHERE o.voided = 0
      AND o.concept_id = (SELECT concept_id FROM concept WHERE uuid = '524fea02-d6e8-47c0-84ee-e7b889f08d4c')
      AND (:endDate IS NULL OR o.obs_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  ) ranked
  WHERE rn = 1
)
-- categoryConceptId identifies the bucket for the drill-down: the matching Current Diagnosis
-- answer concept, else the Malnourished concept, else the sentinel -2 for 'Other'.
SELECT 'currentDiagnosis' AS dimension,
  COALESCE(
    (SELECT ca.answer_concept FROM concept_answer ca
       JOIN concept_name cn ON cn.concept_id = ca.answer_concept AND cn.locale = 'en' AND cn.locale_preferred = 1
     WHERE ca.concept_id = (SELECT concept_id FROM concept WHERE uuid = '51d873b5-3394-4780-87d3-5bfaf5cf0eb8')
       AND cn.name = diag.label
     LIMIT 1),
    CASE WHEN diag.label = 'Malnourished' THEN (SELECT concept_id FROM concept WHERE uuid = 'd6bc13a2-7550-4a67-9611-450f72fdcbd6') END,
    -2
  ) AS categoryConceptId,
  diag.label AS category,
  diag.total AS total
FROM (SELECT label, COUNT(*) AS total FROM latest_diagnosis GROUP BY label) diag

UNION ALL

SELECT 'childLastStatus', c.concept_id, cn.name, COUNT(*)
FROM latest_status ls
JOIN concept c ON c.concept_id = ls.value_coded
JOIN concept_name cn ON cn.concept_id = c.concept_id AND cn.locale = 'en' AND cn.locale_preferred = 1
GROUP BY c.concept_id, cn.name

UNION ALL

-- Alert Status is computed from the patient's actual Appointments-module follow-up appointment:
-- overdue if that appointment date has passed, due soon if within 7 days, OK otherwise. A patient
-- with no appointment scheduled at all falls into its own bucket - there's no date to compare, so
-- it must not be silently counted as OK. That bucket has no backing concept, so it's given the
-- sentinel categoryConceptId -1 (the drilldown query special-cases it the same way).
SELECT
  'alertStatus',
  COALESCE(
    (SELECT c.concept_id FROM concept alertQuestion
       JOIN concept_answer ca ON ca.concept_id = alertQuestion.concept_id
       JOIN concept c ON c.concept_id = ca.answer_concept
       JOIN concept_name cn ON cn.concept_id = c.concept_id AND cn.locale = 'en' AND cn.locale_preferred = 1
     WHERE alertQuestion.uuid = '47266119-f616-4e8a-b094-518b4c2d660b'
       AND cn.name = computed.computedAlertStatus
     LIMIT 1),
    -1
  ),
  COALESCE(computed.computedAlertStatus, 'No Follow-up Scheduled'),
  COUNT(*)
FROM (
  SELECT cp.patient_id,
    CASE
      WHEN nextAppt.nextApptDate IS NULL THEN NULL
      WHEN DATEDIFF(nextAppt.nextApptDate, CURDATE()) < 0 THEN 'OVERDUE'
      WHEN DATEDIFF(nextAppt.nextApptDate, CURDATE()) <= 7 THEN 'DUE SOON'
      ELSE 'OK'
    END AS computedAlertStatus
  FROM cmam_patients cp
  LEFT JOIN (
    SELECT patient_id,
      COALESCE(
        MIN(CASE WHEN start_date_time >= CURDATE() THEN start_date_time END),
        MAX(CASE WHEN start_date_time < CURDATE() THEN start_date_time END)
      ) AS nextApptDate
    FROM patient_appointment
    WHERE voided = 0
    GROUP BY patient_id
  ) nextAppt ON nextAppt.patient_id = cp.patient_id
) computed
GROUP BY computed.computedAlertStatus

ORDER BY dimension, category
