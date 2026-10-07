WITH ewars_map AS (
  SELECT 1  AS sort_order, 'Acute Respiratory Infections' AS label, 'Acute (Upper) Respiratory infection' AS concept_name
  UNION ALL SELECT 1,  'Acute Respiratory Infections', 'Acute (Lower) Respiratory infection (suspected Pneumonia)'
  UNION ALL SELECT 1,  'Acute Respiratory Infections', 'Acute respiratory infection'
  UNION ALL SELECT 2,  'Acute watery Diarrhea',        'Acute Diarrhea (Report)'
  UNION ALL SELECT 3,  'Acute Flaccid Paralysis',      'Acute Flaccid Paralysis (AFP)'
  UNION ALL SELECT 4,  'Suspected Cholera',            'Acute Watery Diarrhea (Suspected Cholera)'
  UNION ALL SELECT 5,  'Suspected Measles',            'Suspected Measles'
  UNION ALL SELECT 6,  'Suspected Mumps',              'Suspected Mumps'
  UNION ALL SELECT 7,  'Suspected Diphtheria',         'Suspected Diptheria'
  UNION ALL SELECT 8,  'Acute Jaundice Syndrome',      'Acute Jaundice Syndrome'
  UNION ALL SELECT 9,  'Suspected tetanus',            'Suspected Neonatal Tetanus'
  UNION ALL SELECT 10, 'Suspected Shigellosis',        'Suspected Shigellosis'
  UNION ALL SELECT 11, 'Suspected Meningitis',         'Suspected Meningitis (Report)'
  UNION ALL SELECT 12, 'Suspected Tuberculosis',       'Suspected Tuberculosis'
  UNION ALL SELECT 13, 'Suspected chickenpox',         'Chicken Pox (Report)'
  UNION ALL SELECT 14, 'Ectoparasitic skin disease',   'Skin Diseases (scabies, chicken pox, lice, etc.)'
  UNION ALL SELECT 15, 'Suspected Impetigo',           'Suspected Impetigo'
  UNION ALL SELECT 16, 'Unusual Event',                'Unusual Event'
),
ewars_concepts AS (
  SELECT em.sort_order, em.label, cn.concept_id
  FROM ewars_map em
  JOIN concept_name cn ON cn.name = em.concept_name
                       AND cn.locale = 'en'
                       AND cn.concept_name_type = 'FULLY_SPECIFIED'
                       AND cn.voided = 0
  JOIN concept c ON c.concept_id = cn.concept_id AND c.retired = 0
)
SELECT DISTINCT
  p.person_id                  AS patientId,
  p.uuid                       AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.family_name, '') AS familyName,
  pi.identifier                AS identifier,
  p.gender                     AS sex,
  pi_nid.identifier            AS nationalId,
  pa_phone.value                AS phoneNumber
FROM (
  SELECT ed.diagnosis_coded AS concept_id, ed.patient_id, e.encounter_datetime AS event_date
  FROM encounter_diagnosis ed
  JOIN encounter e ON e.encounter_id = ed.encounter_id
  WHERE ed.voided = 0
  UNION ALL
  SELECT cd.condition_coded, cd.patient_id, COALESCE(cd.onset_date, cd.date_created)
  FROM conditions cd
  WHERE cd.voided = 0 AND cd.condition_coded IS NOT NULL
) ed
JOIN person p        ON p.person_id = ed.patient_id
JOIN patient pt      ON pt.patient_id = p.person_id
LEFT JOIN person_name pn        ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN patient_identifier pi ON pi.patient_id = pt.patient_id AND pi.voided = 0 AND pi.preferred = 1
LEFT JOIN patient_identifier pi_nid
  ON pi_nid.patient_id = pt.patient_id AND pi_nid.voided = 0
  AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
LEFT JOIN person_attribute pa_phone
  ON pa_phone.person_id = p.person_id AND pa_phone.voided = 0
  AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
WHERE ed.concept_id IN (SELECT concept_id FROM ewars_concepts WHERE label = :diagnosisLabel)
  AND (:gender IS NULL OR p.gender = :gender)
  AND (:startDate IS NULL OR ed.event_date >= :startDate)
  AND (:endDate IS NULL OR ed.event_date < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (
    :ageGroup IS NULL
    OR (:ageGroup = '0-4'   AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) BETWEEN 0  AND 4)
    OR (:ageGroup = '5-14'  AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) BETWEEN 5  AND 14)
    OR (:ageGroup = '15-18' AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) BETWEEN 15 AND 18)
    OR (:ageGroup = '19-49' AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) BETWEEN 19 AND 49)
    OR (:ageGroup = '50-65' AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) BETWEEN 50 AND 65)
    OR (:ageGroup = '65+'   AND TIMESTAMPDIFF(YEAR, p.birthdate, ed.event_date) > 65)
  )
ORDER BY familyName, givenName
