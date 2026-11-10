-- Beneficiaries come from the Nutrition Registration service (program enrollment), the same way
-- the other service-based reports resolve services - NOT from any particular form or encounter
-- type. A patient opted into Nutrition from Care Services / the queue appears here even if no
-- nutrition form has been filled in yet; their clinical columns are then simply blank.
WITH nutrition_enrollments AS (
  SELECT pp.patient_id, pp.date_enrolled, pp.location_id,
    ROW_NUMBER() OVER (PARTITION BY pp.patient_id ORDER BY pp.date_enrolled DESC, pp.patient_program_id DESC) AS rn,
    COUNT(*) OVER (PARTITION BY pp.patient_id) AS visit_count
  FROM patient_program pp
  WHERE pp.voided = 0
    AND pp.program_id = (SELECT program_id FROM program WHERE uuid = '2433ebba-8ffb-11f1-a103-1afee95a890c')
    -- Enrollment overlaps the report period (same overlap rule as patient_encounter_summary.sql).
    AND (:startDate IS NULL OR pp.date_completed IS NULL OR pp.date_completed >= :startDate)
    AND (:endDate IS NULL OR pp.date_enrolled < DATE_ADD(:endDate, INTERVAL 1 DAY))
),
latest_enrollments AS (
  SELECT * FROM nutrition_enrollments WHERE rn = 1
),
-- Nutrition observations, latest first per patient and concept, from ANY encounter/form. Bounded
-- only by the end of the period, so the report shows each beneficiary's values as of that date
-- (a follow-up child whose last MUAC was taken just before the period still shows it).
nutrition_obs AS (
  SELECT o.person_id AS patient_id, c.uuid AS concept_uuid, o.value_numeric, o.value_text, o.value_coded,
    ROW_NUMBER() OVER (PARTITION BY o.person_id, o.concept_id ORDER BY o.obs_datetime DESC, o.obs_id DESC) AS rn
  FROM obs o
  JOIN concept c ON c.concept_id = o.concept_id
  JOIN latest_enrollments le ON le.patient_id = o.person_id
  WHERE o.voided = 0
    AND c.uuid IN (
      '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', -- MUAC
      '838e14c1-d63f-4062-8eaf-edc5edcfabc6', -- beneficiary role (PW/BW/MH/FH)
      '6d4f0916-5913-4e48-82ea-265e379ffb6b', -- nutrition diagnosis
      'c963d0ea-7d87-49a5-9267-e07612c4d3e1', -- type of supplement
      '127b8e09-54dc-4ccd-b078-f0a97206ceca', -- supplement quantity
      '5aadb886-873d-43f8-bd99-53528eb7f04c', -- project
      -- "Child Last Status" (Cured / Under F/U / Defaulter / Death / Transferred) - same concept
      -- the CMAM Follow-up report uses, so an outcome reads consistently across both reports.
      '524fea02-d6e8-47c0-84ee-e7b889f08d4c'
    )
    AND (:endDate IS NULL OR o.obs_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
)
SELECT
  p.person_id AS patientId,
  p.uuid AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.middle_name, '') AS middleName,
  COALESCE(pn.family_name, '') AS familyName,
  -- Beneficiary role - recorded as free text in a mix of short codes and full labels ("PW" and
  -- "Pregnant Women (PW)" both occur), normalized down to the short code. Null for CU5 children.
  CASE
    WHEN roleObs.value_text LIKE '%PW%' THEN 'PW'
    WHEN roleObs.value_text LIKE '%BW%' THEN 'BW'
    WHEN roleObs.value_text LIKE '%MH%' THEN 'MH'
    WHEN roleObs.value_text LIKE '%FH%' THEN 'FH'
    ELSE roleObs.value_text
  END AS category,
  TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
  loc.name AS location,
  le.date_enrolled AS visitDate,
  le.visit_count AS visitCount,
  muacObs.value_numeric AS currentMuac,
  prevMuacObs.value_numeric AS lastMuac,
  -- Diagnosis is recorded as free text; normalized to the 3 standard nutrition classifications.
  -- A bare "Malnourished" (no severity given) is left as-is rather than guessed into SAM or MAM.
  CASE
    WHEN diagnosisObs.value_text LIKE '%SAM%' OR diagnosisObs.value_text LIKE '%Severe%' THEN 'Severe Acute Malnutrition (SAM)'
    WHEN diagnosisObs.value_text LIKE '%MAM%' OR diagnosisObs.value_text LIKE '%Moderate%' THEN 'Moderate Acute Malnutrition (MAM)'
    WHEN diagnosisObs.value_text LIKE '%Normal%' THEN 'Normal Nutritional Status'
    ELSE diagnosisObs.value_text
  END AS diagnosis,
  suppTypeName.name AS typeOfSupplement,
  suppQtyObs.value_numeric AS supplementQuantity,
  pi_nid.identifier AS nationalId,
  pa_phone.value AS phoneNumber,
  projectObs.value_text AS project,
  statusName.name AS status
FROM latest_enrollments le
JOIN person p   ON p.person_id = le.patient_id AND p.voided = 0
JOIN patient pt ON pt.patient_id = p.person_id AND pt.voided = 0
-- Location of the most recent Nutrition enrollment (where the service was given), matching the
-- Location column in the chart's Care Services widget.
LEFT JOIN location loc ON loc.location_id = le.location_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN patient_identifier pi_nid
  ON pi_nid.patient_id = pt.patient_id AND pi_nid.voided = 0
  AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
LEFT JOIN person_attribute pa_phone
  ON pa_phone.person_id = p.person_id AND pa_phone.voided = 0
  AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
LEFT JOIN nutrition_obs roleObs ON roleObs.patient_id = le.patient_id AND roleObs.rn = 1
  AND roleObs.concept_uuid = '838e14c1-d63f-4062-8eaf-edc5edcfabc6'
LEFT JOIN nutrition_obs muacObs ON muacObs.patient_id = le.patient_id AND muacObs.rn = 1
  AND muacObs.concept_uuid = '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
-- Last MUAC = the measurement before the current one, shown side by side with it.
LEFT JOIN nutrition_obs prevMuacObs ON prevMuacObs.patient_id = le.patient_id AND prevMuacObs.rn = 2
  AND prevMuacObs.concept_uuid = '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
LEFT JOIN nutrition_obs diagnosisObs ON diagnosisObs.patient_id = le.patient_id AND diagnosisObs.rn = 1
  AND diagnosisObs.concept_uuid = '6d4f0916-5913-4e48-82ea-265e379ffb6b'
LEFT JOIN nutrition_obs suppTypeObs ON suppTypeObs.patient_id = le.patient_id AND suppTypeObs.rn = 1
  AND suppTypeObs.concept_uuid = 'c963d0ea-7d87-49a5-9267-e07612c4d3e1'
-- Excludes Y/N/Yes/No: this concept's dictionary-level answer set also includes a generic
-- yes/no pair (left over from another form's reuse of it), which isn't a real supplement type.
LEFT JOIN concept_name suppTypeName ON suppTypeName.concept_id = suppTypeObs.value_coded
  AND suppTypeName.locale = 'en' AND suppTypeName.locale_preferred = 1 AND suppTypeName.name NOT IN ('Y', 'N', 'Yes', 'No')
LEFT JOIN nutrition_obs suppQtyObs ON suppQtyObs.patient_id = le.patient_id AND suppQtyObs.rn = 1
  AND suppQtyObs.concept_uuid = '127b8e09-54dc-4ccd-b078-f0a97206ceca'
LEFT JOIN nutrition_obs projectObs ON projectObs.patient_id = le.patient_id AND projectObs.rn = 1
  AND projectObs.concept_uuid = '5aadb886-873d-43f8-bd99-53528eb7f04c'
LEFT JOIN nutrition_obs statusObs ON statusObs.patient_id = le.patient_id AND statusObs.rn = 1
  AND statusObs.concept_uuid = '524fea02-d6e8-47c0-84ee-e7b889f08d4c'
LEFT JOIN concept_name statusName ON statusName.concept_id = statusObs.value_coded
  AND statusName.locale = 'en' AND statusName.locale_preferred = 1
-- :underFive selects which of the two reports (Child Under 5 / Child Above 5) this row belongs
-- to, bucketed by the beneficiary's current age.
HAVING (:underFive = TRUE AND age < 5) OR (:underFive = FALSE AND age >= 5)
ORDER BY familyName, givenName
