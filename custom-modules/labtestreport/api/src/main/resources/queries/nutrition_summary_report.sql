WITH nutrition_encounters AS (
  SELECT e.encounter_id, e.patient_id, e.location_id, e.encounter_datetime,
    ROW_NUMBER() OVER (PARTITION BY e.patient_id ORDER BY e.encounter_datetime DESC, e.encounter_id DESC) AS rn,
    COUNT(*) OVER (PARTITION BY e.patient_id) AS visit_count
  FROM encounter e
  -- Nutrition Assessment encounter type: the real, in-use nutrition data (MUAC, diagnosis,
  -- supplements, project, location) - not the near-empty Nutrition Registration CU5 / Nutrition
  -- WFP PBW test forms.
  WHERE e.voided = 0
    AND e.encounter_type = (SELECT encounter_type_id FROM encounter_type WHERE uuid = '3069ba59-8aea-4a9b-a79a-0d810ea0382b')
    AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
    AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
),
latest_encounters AS (
  SELECT * FROM nutrition_encounters WHERE rn = 1
),
-- The MUAC recorded at the beneficiary's previous visit (if any), so the report can show Current
-- MUAC (this visit) next to Last MUAC (prior visit) side by side.
previous_muac AS (
  SELECT ne.patient_id, o.value_numeric AS last_muac
  FROM nutrition_encounters ne
  JOIN obs o ON o.encounter_id = ne.encounter_id
    AND o.concept_id = (SELECT concept_id FROM concept WHERE uuid = '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    AND o.voided = 0
  WHERE ne.rn = 2
)
SELECT
  p.person_id AS patientId,
  p.uuid AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.family_name, '') AS familyName,
  -- Beneficiary role (PW/BW/MH/FH) - recorded as free text in a mix of short codes and full
  -- labels ("PW" and "Pregnant Women (PW)" both occur), normalized down to the short code. Null
  -- for CU5 children, who aren't assigned a role.
  CASE
    WHEN statusObs.value_text LIKE '%PW%' THEN 'PW'
    WHEN statusObs.value_text LIKE '%BW%' THEN 'BW'
    WHEN statusObs.value_text LIKE '%MH%' THEN 'MH'
    WHEN statusObs.value_text LIKE '%FH%' THEN 'FH'
    ELSE statusObs.value_text
  END AS category,
  TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
  loc.name AS location,
  le.encounter_datetime AS visitDate,
  le.visit_count AS visitCount,
  muacObs.value_numeric AS currentMuac,
  pm.last_muac AS lastMuac,
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
  projectObs.value_text AS project
FROM latest_encounters le
JOIN person p   ON p.person_id = le.patient_id
JOIN patient pt ON pt.patient_id = p.person_id
LEFT JOIN location loc ON loc.location_id = le.location_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN patient_identifier pi_nid
  ON pi_nid.patient_id = pt.patient_id AND pi_nid.voided = 0
  AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
LEFT JOIN person_attribute pa_phone
  ON pa_phone.person_id = p.person_id AND pa_phone.voided = 0
  AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
LEFT JOIN obs statusObs ON statusObs.encounter_id = le.encounter_id
  AND statusObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '838e14c1-d63f-4062-8eaf-edc5edcfabc6') AND statusObs.voided = 0
LEFT JOIN obs muacObs ON muacObs.encounter_id = le.encounter_id
  AND muacObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '1343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') AND muacObs.voided = 0
LEFT JOIN previous_muac pm ON pm.patient_id = le.patient_id
LEFT JOIN obs diagnosisObs ON diagnosisObs.encounter_id = le.encounter_id
  AND diagnosisObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '6d4f0916-5913-4e48-82ea-265e379ffb6b') AND diagnosisObs.voided = 0
LEFT JOIN obs suppTypeObs ON suppTypeObs.encounter_id = le.encounter_id
  AND suppTypeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c963d0ea-7d87-49a5-9267-e07612c4d3e1') AND suppTypeObs.voided = 0
-- Excludes Y/N/Yes/No: this concept's dictionary-level answer set also includes a generic
-- yes/no pair (left over from another form's reuse of it), which isn't a real supplement type.
LEFT JOIN concept_name suppTypeName ON suppTypeName.concept_id = suppTypeObs.value_coded
  AND suppTypeName.locale = 'en' AND suppTypeName.locale_preferred = 1 AND suppTypeName.name NOT IN ('Y', 'N', 'Yes', 'No')
LEFT JOIN obs suppQtyObs ON suppQtyObs.encounter_id = le.encounter_id
  AND suppQtyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '127b8e09-54dc-4ccd-b078-f0a97206ceca') AND suppQtyObs.voided = 0
LEFT JOIN obs projectObs ON projectObs.encounter_id = le.encounter_id
  AND projectObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '5aadb886-873d-43f8-bd99-53528eb7f04c') AND projectObs.voided = 0
-- :underFive selects which of the two reports (Child Under 5 / Child Above 5) this row belongs
-- to, bucketed by the beneficiary's current age.
HAVING (:underFive = TRUE AND age < 5) OR (:underFive = FALSE AND age >= 5)
ORDER BY familyName, givenName
