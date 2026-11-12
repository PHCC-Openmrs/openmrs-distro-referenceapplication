-- Drill-down behind one count of cmam_summary_report_above5.sql. The patient set and the per-dimension
-- bucketing below MUST match that query exactly, so a count and its drill-down list always agree.
-- Counterpart: cmam_patients_for_category.sql (under 5; identical apart from the age condition).
WITH nutrition_enrollments AS (
  SELECT pp.patient_id, pp.location_id,
    ROW_NUMBER() OVER (PARTITION BY pp.patient_id ORDER BY pp.date_enrolled DESC, pp.patient_program_id DESC) AS rn
  FROM patient_program pp
  WHERE pp.voided = 0
    AND pp.program_id = (SELECT program_id FROM program WHERE uuid = '2433ebba-8ffb-11f1-a103-1afee95a890c')
    AND (:startDate IS NULL OR pp.date_completed IS NULL OR pp.date_completed >= :startDate)
    AND (:endDate IS NULL OR pp.date_enrolled < DATE_ADD(:endDate, INTERVAL 1 DAY))
),
cmam_patients AS (
  SELECT ne.patient_id
  FROM nutrition_enrollments ne
  JOIN person p ON p.person_id = ne.patient_id AND p.voided = 0
  WHERE ne.rn = 1
    AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) >= 5
    AND (:locationUuid IS NULL OR ne.location_id = (SELECT location_id FROM location WHERE uuid = :locationUuid))
),
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
),
next_appointment AS (
  SELECT patient_id,
    COALESCE(
      MIN(CASE WHEN start_date_time >= CURDATE() THEN start_date_time END),
      MAX(CASE WHEN start_date_time < CURDATE() THEN start_date_time END)
    ) AS nextApptDate
  FROM patient_appointment
  WHERE voided = 0
  GROUP BY patient_id
),
bucketed AS (
  SELECT cp.patient_id,
    ld.label AS diagnosisLabel,
    ls.value_coded AS statusConceptId,
    na.nextApptDate,
    CASE
      WHEN na.nextApptDate IS NULL THEN 'No Follow-up Scheduled'
      WHEN DATEDIFF(na.nextApptDate, CURDATE()) < 0 THEN 'OVERDUE'
      WHEN DATEDIFF(na.nextApptDate, CURDATE()) <= 7 THEN 'DUE SOON'
      ELSE 'OK'
    END AS alertLabel
  FROM cmam_patients cp
  LEFT JOIN latest_diagnosis ld ON ld.patient_id = cp.patient_id
  LEFT JOIN latest_status ls ON ls.patient_id = cp.patient_id
  LEFT JOIN next_appointment na ON na.patient_id = cp.patient_id
)
SELECT DISTINCT
  p.person_id                  AS patientId,
  p.uuid                       AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.family_name, '') AS familyName,
  pi.identifier                AS identifier,
  p.gender                     AS sex,
  pi_nid.identifier            AS nationalId,
  pa_phone.value               AS phoneNumber,
  b.diagnosisLabel             AS currentDiagnosis,
  cls.name                     AS childLastStatus,
  b.alertLabel                 AS alertStatus,
  -- The follow-up appointment the Alert Status is computed from.
  b.nextApptDate               AS nextVisitDate,
  COALESCE(pn.middle_name, '') AS middleName
FROM bucketed b
JOIN person p   ON p.person_id = b.patient_id
JOIN patient pt ON pt.patient_id = p.person_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN patient_identifier pi ON pi.patient_id = pt.patient_id AND pi.voided = 0 AND pi.preferred = 1
LEFT JOIN patient_identifier pi_nid
  ON pi_nid.patient_id = pt.patient_id AND pi_nid.voided = 0
  AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
LEFT JOIN person_attribute pa_phone
  ON pa_phone.person_id = p.person_id AND pa_phone.voided = 0
  AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
LEFT JOIN concept_name cls ON cls.concept_id = b.statusConceptId AND cls.locale = 'en' AND cls.locale_preferred = 1
WHERE
  -- Current Diagnosis: bucket by label - the name of the category concept, or 'Other' for -2.
  (:dimensionConceptUuid = '51d873b5-3394-4780-87d3-5bfaf5cf0eb8'
    AND (
      (:categoryConceptId = -2 AND b.diagnosisLabel = 'Other')
      OR b.diagnosisLabel = (SELECT name FROM concept_name WHERE concept_id = :categoryConceptId AND locale = 'en' AND locale_preferred = 1)
    ))
  -- Child Last Status: the recorded answer concept itself.
  OR (:dimensionConceptUuid = '524fea02-d6e8-47c0-84ee-e7b889f08d4c' AND b.statusConceptId = :categoryConceptId)
  -- Alert Status: computed label; -1 is the 'No Follow-up Scheduled' sentinel.
  OR (:dimensionConceptUuid = '47266119-f616-4e8a-b094-518b4c2d660b'
    AND (
      (:categoryConceptId = -1 AND b.alertLabel = 'No Follow-up Scheduled')
      OR b.alertLabel = (SELECT name FROM concept_name WHERE concept_id = :categoryConceptId AND locale = 'en' AND locale_preferred = 1)
    ))
ORDER BY familyName, givenName
