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
  -- Scalar subqueries (rather than a plain join) so a patient with more than one non-voided
  -- National ID/Phone Number doesn't fan this encounter out into duplicate rows.
  (SELECT pi_nid.identifier
     FROM patient_identifier pi_nid
    WHERE pi_nid.patient_id = p.person_id AND pi_nid.voided = 0
      AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
    ORDER BY pi_nid.preferred DESC, pi_nid.patient_identifier_id
    LIMIT 1)                        AS nationalId,
  (SELECT pa_phone.value
     FROM person_attribute pa_phone
    WHERE pa_phone.person_id = p.person_id AND pa_phone.voided = 0
      AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
    ORDER BY pa_phone.person_attribute_id
    LIMIT 1)                        AS phoneNumber,
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
  ecgImageObs.value_text           AS ecgAttachmentUuid,
  -- The procedures are now recorded as a drug dropdown plus a quantity. The text columns above
  -- are the answers recorded before that, kept so older records still show.
  imInjectionDrugName.name AS imInjectionDrug,
  imInjectionQtyObs.value_numeric AS imInjectionQuantity,
  ivInjectionDrugName.name AS ivInjectionDrug,
  ivInjectionQtyObs.value_numeric AS ivInjectionQuantity,
  oralDrugName.name AS oralDrug,
  oralQtyObs.value_numeric AS oralQuantity,
  nebulizationDrugName.name AS nebulizationDrug,
  nebulizationQtyObs.value_numeric AS nebulizationQuantity
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
LEFT JOIN obs imInjectionDrugObs ON imInjectionDrugObs.encounter_id = e.encounter_id AND imInjectionDrugObs.voided = 0
  AND imInjectionDrugObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '9d317dc3-9e7c-4ca0-a195-fb5fb444057a')
LEFT JOIN concept_name imInjectionDrugName ON imInjectionDrugName.concept_id = imInjectionDrugObs.value_coded
  AND imInjectionDrugName.voided = 0 AND imInjectionDrugName.locale = 'en' AND imInjectionDrugName.locale_preferred = 1
LEFT JOIN obs imInjectionQtyObs ON imInjectionQtyObs.encounter_id = e.encounter_id AND imInjectionQtyObs.voided = 0
  AND imInjectionQtyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '8c449bc5-522e-4bc9-96a5-bf94a9598830')
LEFT JOIN obs ivInjectionDrugObs ON ivInjectionDrugObs.encounter_id = e.encounter_id AND ivInjectionDrugObs.voided = 0
  AND ivInjectionDrugObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '65bd62b4-cabb-4c43-bfae-4a39bff70ff5')
LEFT JOIN concept_name ivInjectionDrugName ON ivInjectionDrugName.concept_id = ivInjectionDrugObs.value_coded
  AND ivInjectionDrugName.voided = 0 AND ivInjectionDrugName.locale = 'en' AND ivInjectionDrugName.locale_preferred = 1
LEFT JOIN obs ivInjectionQtyObs ON ivInjectionQtyObs.encounter_id = e.encounter_id AND ivInjectionQtyObs.voided = 0
  AND ivInjectionQtyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ebab3ca6-66b3-4295-a524-2833bc17a636')
LEFT JOIN obs oralDrugObs ON oralDrugObs.encounter_id = e.encounter_id AND oralDrugObs.voided = 0
  AND oralDrugObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '9a67de0d-0b5f-465b-b08a-43af10577ba1')
LEFT JOIN concept_name oralDrugName ON oralDrugName.concept_id = oralDrugObs.value_coded
  AND oralDrugName.voided = 0 AND oralDrugName.locale = 'en' AND oralDrugName.locale_preferred = 1
LEFT JOIN obs oralQtyObs ON oralQtyObs.encounter_id = e.encounter_id AND oralQtyObs.voided = 0
  AND oralQtyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '3861a9c6-ded7-4b86-abb6-cd9de557ac43')
LEFT JOIN obs nebulizationDrugObs ON nebulizationDrugObs.encounter_id = e.encounter_id AND nebulizationDrugObs.voided = 0
  AND nebulizationDrugObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '5ea5d0e1-453b-4414-9a6b-6033ebd44174')
LEFT JOIN concept_name nebulizationDrugName ON nebulizationDrugName.concept_id = nebulizationDrugObs.value_coded
  AND nebulizationDrugName.voided = 0 AND nebulizationDrugName.locale = 'en' AND nebulizationDrugName.locale_preferred = 1
LEFT JOIN obs nebulizationQtyObs ON nebulizationQtyObs.encounter_id = e.encounter_id AND nebulizationQtyObs.voided = 0
  AND nebulizationQtyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '393a7a86-abcb-4e40-9065-1e25a25867cd')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY e.encounter_datetime DESC
