-- One row per Health Promotion Session encounter, with every field that was filled in on that form.
--
-- This joins on the form, not on the encounter type. The form's schema declares encounter type
-- d7151f82-c1f3-4152-a605-2f9ea7414a79, but that is the stock "Visit Note" type that many other
-- forms also write against -- joining on it the way the SRH and Nursing reports do (those forms
-- each own a dedicated encounter type) would pull every unrelated visit note into this report.
--
-- Matching on the form's name rather than its uuid is deliberate: Form Builder re-versioning
-- creates a new form row with a new uuid but the same name, which is exactly what stales out the
-- pinned uuid in referral_form_report.sql. Matching by name keeps every version of the form in
-- scope. If this ever needs pinning to one specific version instead, swap the predicate for
-- f.uuid = '<that version's form uuid>'.
SELECT
  p.person_id                      AS patientId,
  p.uuid                           AS patientUuid,
  COALESCE(pn.given_name, '')      AS givenName,
  COALESCE(pn.middle_name, '')     AS middleName,
  COALESCE(pn.family_name, '')     AS familyName,
  e.encounter_id                   AS encounterId,
  e.encounter_datetime             AS encounterDatetime,
  l.name                           AS location,
  participantNameObs.value_text    AS participantName,
  ageObs.value_numeric             AS age,
  CASE genderAnswer.uuid
    WHEN '65af055d-1f15-46bb-a24e-fdaaed0c407b' THEN 'Male'
    WHEN 'da38e7f7-ea53-48b7-8caa-daf90cef95a7' THEN 'Female'
    WHEN '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' THEN 'Other'
    ELSE NULL
  END                              AS gender,
  -- The form has no National ID field, so this comes off the patient record. A scalar subquery
  -- (rather than a plain join) so a patient with more than one non-voided National ID doesn't fan
  -- this encounter out into duplicate rows.
  (SELECT pi_nid.identifier
     FROM patient_identifier pi_nid
    WHERE pi_nid.patient_id = p.person_id AND pi_nid.voided = 0
      AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
    ORDER BY pi_nid.preferred DESC, pi_nid.patient_identifier_id
    LIMIT 1)                       AS nationalId,
  phoneNumberObs.value_text        AS phoneNumber,
  sessionDateObs.value_datetime    AS sessionDate,
  -- Session Type and Topic are coded, and Topic in particular is a list the form is expected to
  -- grow. Resolving the answer through concept_name (rather than a CASE over today's answer uuids)
  -- means a newly added answer shows up in the report without a change here. These are scalar
  -- subqueries rather than joins so a concept carrying more than one English name cannot fan a
  -- single encounter out into duplicate rows.
  (SELECT cn.name
     FROM concept_name cn
    WHERE cn.concept_id = sessionTypeObs.value_coded AND cn.voided = 0 AND cn.locale = 'en'
    ORDER BY cn.locale_preferred DESC, cn.concept_name_id
    LIMIT 1)                       AS sessionType,
  (SELECT cn.name
     FROM concept_name cn
    WHERE cn.concept_id = topicObs.value_coded AND cn.voided = 0 AND cn.locale = 'en'
    ORDER BY cn.locale_preferred DESC, cn.concept_name_id
    LIMIT 1)                       AS topic,
  -- The free-text "Location" the session was held at, as typed on the form. This is distinct from
  -- the encounter's own location above, which is the facility the form was submitted from.
  sessionLocationObs.value_text    AS sessionLocation,
  chwNameObs.value_text            AS chwName,
  notesObs.value_text              AS notes
FROM encounter e
JOIN form f ON f.form_id = e.form_id AND f.name = 'Health Promotion Session Form'
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs participantNameObs ON participantNameObs.encounter_id = e.encounter_id AND participantNameObs.voided = 0
  AND participantNameObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '893db5a7-418e-4e6c-8098-f9d06d98a7c1')
LEFT JOIN obs ageObs ON ageObs.encounter_id = e.encounter_id AND ageObs.voided = 0
  AND ageObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ea3c8357-2587-491b-8a8e-ddf7b481e265')
LEFT JOIN obs genderObs ON genderObs.encounter_id = e.encounter_id AND genderObs.voided = 0
  AND genderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '117b8efb-3de0-48a1-8f9d-edda88942e8c')
LEFT JOIN concept genderAnswer ON genderAnswer.concept_id = genderObs.value_coded
LEFT JOIN obs phoneNumberObs ON phoneNumberObs.encounter_id = e.encounter_id AND phoneNumberObs.voided = 0
  AND phoneNumberObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7c6718e0-9d0d-4e80-b979-33f6b0ca8a63')
LEFT JOIN obs sessionDateObs ON sessionDateObs.encounter_id = e.encounter_id AND sessionDateObs.voided = 0
  AND sessionDateObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ceaca505-6dff-4940-8a43-8c060a0924d7')
LEFT JOIN obs sessionTypeObs ON sessionTypeObs.encounter_id = e.encounter_id AND sessionTypeObs.voided = 0
  AND sessionTypeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c271aba7-1feb-4215-afde-6e37f2ef1800')
LEFT JOIN obs topicObs ON topicObs.encounter_id = e.encounter_id AND topicObs.voided = 0
  AND topicObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '4442d405-4ff2-45d7-a272-1a4f3a134486')
LEFT JOIN obs sessionLocationObs ON sessionLocationObs.encounter_id = e.encounter_id AND sessionLocationObs.voided = 0
  AND sessionLocationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '4372b99c-a9b2-4eef-b339-a2e9b69c5ba2')
LEFT JOIN obs chwNameObs ON chwNameObs.encounter_id = e.encounter_id AND chwNameObs.voided = 0
  AND chwNameObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '8f129f81-e078-4664-be97-649b66162a50')
LEFT JOIN obs notesObs ON notesObs.encounter_id = e.encounter_id AND notesObs.voided = 0
  AND notesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '78a043eb-8a39-4fc4-a917-526df7314604')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY e.encounter_datetime DESC
