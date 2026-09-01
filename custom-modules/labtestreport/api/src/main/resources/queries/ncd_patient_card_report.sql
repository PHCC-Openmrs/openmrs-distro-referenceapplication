SELECT
  p.person_id                   AS patientId,
  p.uuid                        AS patientUuid,
  COALESCE(pn.given_name, '')   AS givenName,
  COALESCE(pn.middle_name, '')  AS middleName,
  COALESCE(pn.family_name, '')  AS familyName,
  e.encounter_id                AS encounterId,
  e.encounter_datetime          AS encounterDatetime,
  l.name                        AS location,
  -- The "File Number" question was renamed to "National ID" (and moved to the same concept the
  -- Referral Form uses) in a later form version. Older submissions only ever filled in the old
  -- File Number concept, so fall back to it when the current concept is empty.
  COALESCE(nationalIdObs.value_text, fileNumberObs.value_text) AS nationalId,
  dobObs.value_datetime         AS dob,
  CASE genderAnswer.uuid
    WHEN '65af055d-1f15-46bb-a24e-fdaaed0c407b' THEN 'Male'
    WHEN 'da38e7f7-ea53-48b7-8caa-daf90cef95a7' THEN 'Female'
    WHEN '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' THEN 'Other'
    ELSE NULL
  END                            AS gender,
  phoneNumberObs.value_text     AS phoneNumber,
  addressObs.value_text         AS address,
  CASE conditionAnswer.uuid
    WHEN '117399AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' THEN 'Hypertension'
    WHEN 'e81027bd-c331-4253-9e98-d47886190ba4' THEN 'Diabetes'
    WHEN 'dd98d5b8-f0ab-4a06-8d54-0674d774ceec' THEN 'Both'
    ELSE NULL
  END                            AS condition_,
  conditionStartObs.value_datetime AS conditionStart,
  CASE statusAnswer.uuid
    WHEN '958be653-35e9-42c6-9147-fdd4f9dc8b1e' THEN 'Stable'
    WHEN '2a6ce0fc-c7fe-4a2d-b088-493c04cad4ed' THEN 'Uncontrolled'
    WHEN 'f78e97a7-b371-4761-9e30-7e0ef2b8d907' THEN 'Complicated'
    ELSE NULL
  END                            AS status,
  followDateObs.value_datetime  AS followDate,
  bpObs.value_text              AS bp,
  glucoseObs.value_numeric      AS glucose,
  medicationObs.value_text      AS medication,
  nextFollowObs.value_datetime  AS nextFollow
FROM encounter e
JOIN form f ON f.form_id = e.form_id AND f.uuid = '07c0ec98-4986-48c7-b2c9-d99a456b2160'
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs fileNumberObs ON fileNumberObs.encounter_id = e.encounter_id AND fileNumberObs.voided = 0
  AND fileNumberObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '5df735ce-f0fd-45c3-b192-b6e8ad842ac3')
LEFT JOIN obs nationalIdObs ON nationalIdObs.encounter_id = e.encounter_id AND nationalIdObs.voided = 0
  AND nationalIdObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '2fb9ed2f-2e35-4f2d-b5c3-888fe43f477e')
LEFT JOIN obs dobObs ON dobObs.encounter_id = e.encounter_id AND dobObs.voided = 0
  AND dobObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '04ed6b8e-a2af-43ee-9866-f361afa74501')
LEFT JOIN obs genderObs ON genderObs.encounter_id = e.encounter_id AND genderObs.voided = 0
  AND genderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7e6e3c52-349d-4e3b-b3d4-013de78dfe26')
LEFT JOIN concept genderAnswer ON genderAnswer.concept_id = genderObs.value_coded
LEFT JOIN obs phoneNumberObs ON phoneNumberObs.encounter_id = e.encounter_id AND phoneNumberObs.voided = 0
  AND phoneNumberObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7c6718e0-9d0d-4e80-b979-33f6b0ca8a63')
LEFT JOIN obs addressObs ON addressObs.encounter_id = e.encounter_id AND addressObs.voided = 0
  AND addressObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'a422fd06-dcbd-4408-8898-7810e6fc0918')
LEFT JOIN obs conditionObs ON conditionObs.encounter_id = e.encounter_id AND conditionObs.voided = 0
  AND conditionObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '3c5d8681-6726-4cc0-b4c6-1a0c041e74f8')
LEFT JOIN concept conditionAnswer ON conditionAnswer.concept_id = conditionObs.value_coded
LEFT JOIN obs conditionStartObs ON conditionStartObs.encounter_id = e.encounter_id AND conditionStartObs.voided = 0
  AND conditionStartObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '87a3a19d-bcc9-41c8-aa9c-30ac2b4adadc')
LEFT JOIN obs statusObs ON statusObs.encounter_id = e.encounter_id AND statusObs.voided = 0
  AND statusObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '6ffdc3fa-b9fe-40fd-b7ae-2c1ac3b67f1c')
LEFT JOIN concept statusAnswer ON statusAnswer.concept_id = statusObs.value_coded
LEFT JOIN obs followDateObs ON followDateObs.encounter_id = e.encounter_id AND followDateObs.voided = 0
  AND followDateObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '3b835196-0c93-4ff2-a74a-361592ed1d18')
LEFT JOIN obs bpObs ON bpObs.encounter_id = e.encounter_id AND bpObs.voided = 0
  AND bpObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'a8ea6504-09c7-4a96-b742-52bee34790ca')
LEFT JOIN obs glucoseObs ON glucoseObs.encounter_id = e.encounter_id AND glucoseObs.voided = 0
  AND glucoseObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
LEFT JOIN obs medicationObs ON medicationObs.encounter_id = e.encounter_id AND medicationObs.voided = 0
  AND medicationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'acf6ed34-86d6-4a18-b7f5-69f0ad212aff')
LEFT JOIN obs nextFollowObs ON nextFollowObs.encounter_id = e.encounter_id AND nextFollowObs.voided = 0
  AND nextFollowObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '2eb60974-47c6-47d0-a07d-b403d548105f')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY e.encounter_datetime DESC
