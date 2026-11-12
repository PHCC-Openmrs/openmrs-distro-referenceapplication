-- One row per Health Promotion Session Form submission (encounter), carrying just what the Monthly
-- Health Promotion Report needs to place it in its grid: the session's effective date, Session Type,
-- Topic ("session subject") and the participant's age and gender. The service pivots these into the
-- session type x subject x age-group/gender grid, works out which sessions are follow-ups, applies
-- the date range, and filters the very same rows for a drill-down, so the clicked count and the
-- patient list can never disagree.
--
-- Deliberately NOT date-filtered here: a follow-up is a session by a patient who has attended an
-- earlier one, and that earlier session may fall before the reporting period.
--
-- Form, session type and topic resolution follow health_promotion_report.sql (see the comments
-- there for why the form is matched by name and why Topic is COALESCEd across two concepts).
SELECT
  e.patient_id                                         AS patientId,
  e.encounter_id                                       AS encounterId,
  COALESCE(sessionDateObs.value_datetime, e.encounter_datetime) AS sessionDate,
  (SELECT cn.name
     FROM concept_name cn
    WHERE cn.concept_id = sessionTypeObs.value_coded AND cn.voided = 0 AND cn.locale = 'en'
    ORDER BY cn.locale_preferred DESC, cn.concept_name_id
    LIMIT 1)                                           AS sessionType,
  COALESCE(
    topicTextObs.value_text,
    (SELECT cn.name
       FROM concept_name cn
      WHERE cn.concept_id = topicCodedObs.value_coded AND cn.voided = 0 AND cn.locale = 'en'
      ORDER BY cn.locale_preferred DESC, cn.concept_name_id
      LIMIT 1)
  )                                                    AS topic,
  -- The participant's age as typed on the form; for older submissions without one, the patient's
  -- age on the session date.
  COALESCE(ageObs.value_numeric,
           TIMESTAMPDIFF(YEAR, p.birthdate, COALESCE(sessionDateObs.value_datetime, e.encounter_datetime))) AS age,
  COALESCE(
    CASE genderAnswer.uuid
      WHEN '65af055d-1f15-46bb-a24e-fdaaed0c407b' THEN 'M'
      WHEN 'da38e7f7-ea53-48b7-8caa-daf90cef95a7' THEN 'F'
      ELSE NULL
    END,
    p.gender)                                          AS gender
FROM encounter e
JOIN form f ON f.form_id = e.form_id AND f.name = 'Health Promotion Session Form'
JOIN person p ON p.person_id = e.patient_id AND p.voided = 0
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs ageObs ON ageObs.encounter_id = e.encounter_id AND ageObs.voided = 0
  AND ageObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ea3c8357-2587-491b-8a8e-ddf7b481e265')
LEFT JOIN obs genderObs ON genderObs.encounter_id = e.encounter_id AND genderObs.voided = 0
  AND genderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '117b8efb-3de0-48a1-8f9d-edda88942e8c')
LEFT JOIN concept genderAnswer ON genderAnswer.concept_id = genderObs.value_coded
LEFT JOIN obs sessionDateObs ON sessionDateObs.encounter_id = e.encounter_id AND sessionDateObs.voided = 0
  AND sessionDateObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ceaca505-6dff-4940-8a43-8c060a0924d7')
LEFT JOIN obs sessionTypeObs ON sessionTypeObs.encounter_id = e.encounter_id AND sessionTypeObs.voided = 0
  AND sessionTypeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c271aba7-1feb-4215-afde-6e37f2ef1800')
LEFT JOIN obs topicCodedObs ON topicCodedObs.encounter_id = e.encounter_id AND topicCodedObs.voided = 0
  -- the original coded "Topic" concept plus the per-category "Health Promotion Topic - <category>" concepts the form
  -- now uses (only the selected category's topic question is ever answered, so this matches at most one obs)
  AND topicCodedObs.concept_id IN (SELECT c.concept_id FROM concept c
                                    WHERE c.uuid = '4442d405-4ff2-45d7-a272-1a4f3a134486'
                                       OR c.concept_id IN (SELECT cn.concept_id FROM concept_name cn
                                                            WHERE cn.name LIKE 'Health Promotion Topic - %' AND cn.voided = 0))
LEFT JOIN obs topicTextObs ON topicTextObs.encounter_id = e.encounter_id AND topicTextObs.voided = 0
  AND topicTextObs.concept_id = (SELECT cn.concept_id
                                    FROM concept_name cn
                                   WHERE cn.name = 'Health Promotion Topic' AND cn.voided = 0
                                   LIMIT 1)
WHERE e.voided = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
