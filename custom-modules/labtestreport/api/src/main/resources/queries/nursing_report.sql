-- One row per Nursing encounter, with every nursing observation recorded against it.
--
-- Unlike the Referral Form and NCD Patient Card reports, nursing records are not entered through
-- a Form Builder form: the Nursing tab of the patient chart writes them straight through the REST
-- API with an encounter type and no form_id. So this joins on encounter_type rather than form, and
-- takes age/gender from the patient record instead of from obs on the encounter (the nursing form
-- never re-asks for them).
SELECT
  p.person_id                      AS patientId,
  p.uuid                           AS patientUuid,
  COALESCE(pn.given_name, '')      AS givenName,
  COALESCE(pn.middle_name, '')     AS middleName,
  COALESCE(pn.family_name, '')     AS familyName,
  e.encounter_id                   AS encounterId,
  e.encounter_datetime             AS encounterDatetime,
  l.name                           AS location,
  TIMESTAMPDIFF(YEAR, p.birthdate, e.encounter_datetime) AS age,
  CASE p.gender
    WHEN 'M' THEN 'Male'
    WHEN 'F' THEN 'Female'
    WHEN 'O' THEN 'Other'
    ELSE NULL
  END                              AS gender,
  typeOfWoundObs.value_text        AS typeOfWound,
  -- The Ointment multi-select is stored as one coded obs per ointment, so it is collapsed here
  -- into a single comma-separated cell rather than multiplying the encounter into several rows.
  (SELECT GROUP_CONCAT(ointmentName.name ORDER BY ointmentName.name SEPARATOR ', ')
     FROM obs ointmentObs
     JOIN concept_name ointmentName ON ointmentName.concept_id = ointmentObs.value_coded
       AND ointmentName.voided = 0 AND ointmentName.locale = 'en' AND ointmentName.locale_preferred = 1
    WHERE ointmentObs.encounter_id = e.encounter_id
      AND ointmentObs.voided = 0
      AND ointmentObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '74286289-c1a9-4c8b-8b5a-19b547d7e58e')
  )                                AS ointments,
  dressingNotesObs.value_text      AS dressingGeneralNotes,
  spirometryObs.value_numeric      AS spirometry,
  monofilamentObs.value_numeric    AS monofilament,
  imInjectionObs.value_text        AS imInjection,
  ivInjectionObs.value_text        AS ivInjection,
  oralObs.value_text               AS oral,
  nebulizationObs.value_text       AS nebulization,
  -- The ECG image itself is stored as a patient attachment; this obs holds that attachment's uuid,
  -- which is what ties it to the nursing encounter it was recorded in.
  ecgImageObs.value_text           AS ecgAttachmentUuid
FROM encounter e
JOIN encounter_type et ON et.encounter_type_id = e.encounter_type
  AND et.uuid = 'e621c128-a8a8-4c98-be26-3ceb92c68cfa'
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs typeOfWoundObs ON typeOfWoundObs.encounter_id = e.encounter_id AND typeOfWoundObs.voided = 0
  AND typeOfWoundObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'fb801b00-0eeb-42ca-8683-7f968eb5f51f')
LEFT JOIN obs dressingNotesObs ON dressingNotesObs.encounter_id = e.encounter_id AND dressingNotesObs.voided = 0
  AND dressingNotesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ee5488f1-4ac6-4ab6-a12d-46dd4630d584')
LEFT JOIN obs spirometryObs ON spirometryObs.encounter_id = e.encounter_id AND spirometryObs.voided = 0
  AND spirometryObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '26cd9082-7d3a-4955-ae2a-aae22e19cfe1')
LEFT JOIN obs monofilamentObs ON monofilamentObs.encounter_id = e.encounter_id AND monofilamentObs.voided = 0
  AND monofilamentObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'b9e461bc-432f-44df-82ae-e08e4c4ad7cf')
LEFT JOIN obs imInjectionObs ON imInjectionObs.encounter_id = e.encounter_id AND imInjectionObs.voided = 0
  AND imInjectionObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '33db9b1c-77b6-4360-9fc5-f8724145fcb7')
LEFT JOIN obs ivInjectionObs ON ivInjectionObs.encounter_id = e.encounter_id AND ivInjectionObs.voided = 0
  AND ivInjectionObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'bfeb3e24-1aab-42c3-beb1-33ab91fdbe7b')
LEFT JOIN obs oralObs ON oralObs.encounter_id = e.encounter_id AND oralObs.voided = 0
  AND oralObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '99a79867-1b40-43ab-ac08-6483acfd3a46')
LEFT JOIN obs nebulizationObs ON nebulizationObs.encounter_id = e.encounter_id AND nebulizationObs.voided = 0
  AND nebulizationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '992966a6-45b5-4b32-b515-b0a298881e35')
LEFT JOIN obs ecgImageObs ON ecgImageObs.encounter_id = e.encounter_id AND ecgImageObs.voided = 0
  AND ecgImageObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '46e50d98-f499-4352-aea9-82b85d1dc4db')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY e.encounter_datetime DESC
