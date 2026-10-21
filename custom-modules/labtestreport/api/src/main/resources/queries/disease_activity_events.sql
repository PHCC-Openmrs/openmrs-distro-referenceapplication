-- One row per patient, report diagnosis concept and day for the Primary Health Activity layout of the
-- disease surveillance summary report. The service maps each concept to its report row (from
-- disease_summary_diagnosis_map.csv) and collapses repeats of the same patient/row/day, so the
-- DISTINCT here only removes exact duplicates. Event sources, age bands and the location rule are the
-- same as disease_summary_report.sql.
WITH diagnosis_events AS (
  SELECT ed.diagnosis_coded AS concept_id, ed.patient_id, e.encounter_datetime AS event_date, e.location_id
  FROM encounter_diagnosis ed
  JOIN encounter e ON e.encounter_id = ed.encounter_id
  WHERE ed.voided = 0 AND ed.diagnosis_coded IN (:conceptIds)
  UNION ALL
  -- Conditions aren't tied to an encounter, so they're placed at the location of the visit the
  -- patient had open when the condition was recorded (NULL if none, i.e. only counted under all locations).
  SELECT cd.condition_coded, cd.patient_id, COALESCE(cd.onset_date, cd.date_created),
    (SELECT v.location_id
       FROM visit v
      WHERE v.patient_id = cd.patient_id AND v.voided = 0
        AND v.date_started <= cd.date_created
        AND (v.date_stopped IS NULL OR v.date_stopped >= cd.date_created)
      ORDER BY v.date_started DESC
      LIMIT 1)
  FROM conditions cd
  WHERE cd.voided = 0 AND cd.condition_coded IN (:conceptIds)
)
SELECT DISTINCT
  de.concept_id,
  de.patient_id,
  DATE(de.event_date) AS event_day,
  CASE
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 0  AND 4  THEN '0-4'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 5  AND 14 THEN '5-14'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 15 AND 18 THEN '15-18'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 19 AND 49 THEN '19-49'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, de.event_date) BETWEEN 50 AND 65 THEN '50-65'
    ELSE '65+'
  END AS age_group,
  p.gender
FROM diagnosis_events de
JOIN person p ON p.person_id = de.patient_id
WHERE (:startDate IS NULL OR de.event_date >= :startDate)
  AND (:endDate IS NULL OR de.event_date < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR de.location_id = (SELECT location_id FROM location WHERE uuid = :locationUuid))
