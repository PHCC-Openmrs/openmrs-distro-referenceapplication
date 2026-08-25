-- Filter dropdown options for the Nutrition (Child Under 5 / Child Above 5) reports, pulled
-- straight from the database rather than from whatever happens to be in the currently-loaded
-- report rows.
SELECT 'location' AS filterType, l.name AS optionValue
FROM (
  SELECT DISTINCT e.location_id
  FROM encounter e
  WHERE e.voided = 0
    AND e.encounter_type = (SELECT encounter_type_id FROM encounter_type WHERE uuid = '3069ba59-8aea-4a9b-a79a-0d810ea0382b')
) used_location
JOIN location l ON l.location_id = used_location.location_id

UNION

-- Beneficiary role, normalized the same way as the main report query (short code, e.g. "PW"
-- rather than "Pregnant Women (PW)").
SELECT 'category', CASE
    WHEN o.value_text LIKE '%PW%' THEN 'PW'
    WHEN o.value_text LIKE '%BW%' THEN 'BW'
    WHEN o.value_text LIKE '%MH%' THEN 'MH'
    WHEN o.value_text LIKE '%FH%' THEN 'FH'
    ELSE o.value_text
  END
FROM obs o
JOIN encounter e ON e.encounter_id = o.encounter_id
WHERE o.concept_id = (SELECT concept_id FROM concept WHERE uuid = '838e14c1-d63f-4062-8eaf-edc5edcfabc6')
  AND o.voided = 0
  AND e.encounter_type = (SELECT encounter_type_id FROM encounter_type WHERE uuid = '3069ba59-8aea-4a9b-a79a-0d810ea0382b')

UNION

-- Diagnosis: only the 3 standard nutrition classifications, normalized the same way as the main
-- report query. A bare "Malnourished" (no severity given) doesn't match any of the 3 and is
-- deliberately excluded here rather than guessed into SAM or MAM.
SELECT 'diagnosis', CASE
    WHEN o.value_text LIKE '%SAM%' OR o.value_text LIKE '%Severe%' THEN 'Severe Acute Malnutrition (SAM)'
    WHEN o.value_text LIKE '%MAM%' OR o.value_text LIKE '%Moderate%' THEN 'Moderate Acute Malnutrition (MAM)'
    WHEN o.value_text LIKE '%Normal%' THEN 'Normal Nutritional Status'
  END
FROM obs o
JOIN encounter e ON e.encounter_id = o.encounter_id
WHERE o.concept_id = (SELECT concept_id FROM concept WHERE uuid = '6d4f0916-5913-4e48-82ea-265e379ffb6b')
  AND o.voided = 0
  AND e.encounter_type = (SELECT encounter_type_id FROM encounter_type WHERE uuid = '3069ba59-8aea-4a9b-a79a-0d810ea0382b')
  AND (o.value_text LIKE '%SAM%' OR o.value_text LIKE '%Severe%' OR o.value_text LIKE '%MAM%'
       OR o.value_text LIKE '%Moderate%' OR o.value_text LIKE '%Normal%')

UNION

-- Type of Supplement: defined answers, excluding the generic Y/N/Yes/No pair left over from
-- another form's reuse of this concept - not a real supplement type.
SELECT 'supplementType', cn.name
FROM concept_answer ca
JOIN concept c ON c.concept_id = ca.answer_concept
JOIN concept_name cn ON cn.concept_id = c.concept_id AND cn.locale = 'en' AND cn.locale_preferred = 1
WHERE ca.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c963d0ea-7d87-49a5-9267-e07612c4d3e1')
  AND cn.name NOT IN ('Y', 'N', 'Yes', 'No')

UNION

SELECT 'supplementType', cn.name
FROM obs o
JOIN encounter e ON e.encounter_id = o.encounter_id
JOIN concept_name cn ON cn.concept_id = o.value_coded AND cn.locale = 'en' AND cn.locale_preferred = 1
WHERE o.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c963d0ea-7d87-49a5-9267-e07612c4d3e1')
  AND o.voided = 0
  AND e.encounter_type = (SELECT encounter_type_id FROM encounter_type WHERE uuid = '3069ba59-8aea-4a9b-a79a-0d810ea0382b')
  AND cn.name NOT IN ('Y', 'N', 'Yes', 'No')

UNION

-- Status (Cured / Under F/U / Defaulter / Death / Transferred): defined answers, same as the
-- CMAM Follow-up report's Child Last Status concept.
SELECT 'status', cn.name
FROM concept_answer ca
JOIN concept c ON c.concept_id = ca.answer_concept
JOIN concept_name cn ON cn.concept_id = c.concept_id AND cn.locale = 'en' AND cn.locale_preferred = 1
WHERE ca.concept_id = (SELECT concept_id FROM concept WHERE uuid = '524fea02-d6e8-47c0-84ee-e7b889f08d4c')

ORDER BY filterType, optionValue
