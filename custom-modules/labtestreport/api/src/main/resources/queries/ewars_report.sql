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
),
diagnosis_events AS (
  SELECT ed.diagnosis_coded AS concept_id, ed.patient_id, e.encounter_datetime AS event_date
  FROM encounter_diagnosis ed
  JOIN encounter e ON e.encounter_id = ed.encounter_id
  WHERE ed.voided = 0
  UNION ALL
  SELECT cd.condition_coded, cd.patient_id, COALESCE(cd.onset_date, cd.date_created)
  FROM conditions cd
  WHERE cd.voided = 0 AND cd.condition_coded IS NOT NULL
),
qualifying_diagnoses AS (
  SELECT
    de.concept_id,
    p.gender,
    CASE
      WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 0  AND 4  THEN '0-4'
      WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 5  AND 14 THEN '5-14'
      WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 15 AND 18 THEN '15-18'
      WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 19 AND 49 THEN '19-49'
      WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 50 AND 65 THEN '50-65'
      ELSE '65+'
    END AS age_group
  FROM diagnosis_events de
  JOIN person p ON p.person_id = de.patient_id
  WHERE (:startDate IS NULL OR de.event_date >= :startDate)
    AND (:endDate IS NULL OR de.event_date < DATE_ADD(:endDate, INTERVAL 1 DAY))
),
labels AS (
  SELECT DISTINCT sort_order, label FROM ewars_map
)
SELECT
  l.label AS diagnosisLabel,
  SUM(CASE WHEN qd.age_group = '0-4'   AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_0_4_male,
  SUM(CASE WHEN qd.age_group = '0-4'   AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_0_4_female,
  SUM(CASE WHEN qd.age_group = '5-14'  AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_5_14_male,
  SUM(CASE WHEN qd.age_group = '5-14'  AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_5_14_female,
  SUM(CASE WHEN qd.age_group = '15-18' AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_15_18_male,
  SUM(CASE WHEN qd.age_group = '15-18' AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_15_18_female,
  SUM(CASE WHEN qd.age_group = '19-49' AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_19_49_male,
  SUM(CASE WHEN qd.age_group = '19-49' AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_19_49_female,
  SUM(CASE WHEN qd.age_group = '50-65' AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_50_65_male,
  SUM(CASE WHEN qd.age_group = '50-65' AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_50_65_female,
  SUM(CASE WHEN qd.age_group = '65+'   AND qd.gender = 'M' THEN 1 ELSE 0 END) AS age_65_plus_male,
  SUM(CASE WHEN qd.age_group = '65+'   AND qd.gender = 'F' THEN 1 ELSE 0 END) AS age_65_plus_female,
  COUNT(qd.age_group) AS total
FROM labels l
LEFT JOIN ewars_concepts ec ON ec.sort_order = l.sort_order
LEFT JOIN qualifying_diagnoses qd ON qd.concept_id = ec.concept_id
GROUP BY l.sort_order, l.label
ORDER BY l.sort_order
