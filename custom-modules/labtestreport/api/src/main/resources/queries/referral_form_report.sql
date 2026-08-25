SELECT
  p.person_id                      AS patientId,
  p.uuid                           AS patientUuid,
  COALESCE(pn.given_name, '')      AS givenName,
  COALESCE(pn.family_name, '')     AS familyName,
  e.encounter_id                   AS encounterId,
  e.encounter_datetime             AS encounterDatetime,
  l.name                           AS location,
  fullNameObs.value_text           AS fullName,
  ageObs.value_numeric             AS age,
  CASE genderAnswer.uuid
    WHEN '65af055d-1f15-46bb-a24e-fdaaed0c407b' THEN 'Male'
    WHEN 'da38e7f7-ea53-48b7-8caa-daf90cef95a7' THEN 'Female'
    WHEN '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' THEN 'Other'
    ELSE NULL
  END                               AS gender,
  referralDateObs.value_datetime   AS referralDate,
  DATE_FORMAT(referralTimeObs.value_datetime, '%H:%i') AS referralTime,
  -- Despite the concept's dictionary short name ("Referral Patient ID"), the form itself labels
  -- this field "National ID" and auto-fills it from the patient's National ID identifier.
  nationalIdObs.value_text         AS nationalId,
  phoneNumberObs.value_text        AS phoneNumber,
  referringFacilityObs.value_text  AS referringFacility,
  referredToObs.value_text         AS referredTo,
  urgencyObs.value_text            AS urgency,
  transportationObs.value_text     AS transportation,
  referralCauseObs.value_text      AS referralCause,
  clinicalHistoryObs.value_text    AS clinicalHistory,
  managementReceivedObs.value_text AS managementReceived,
  referringDoctorObs.value_text    AS referringDoctor,
  headOfClinicObs.value_text       AS headOfClinic,
  feedbackObs.value_text           AS feedback,
  followUpObs.value_text           AS followUp,
  treatingDoctorObs.value_text     AS treatingDoctor
FROM encounter e
-- 62f41812-6614-4a65-b6fb-524175aeeccb is "Referral Form" v1.6, the current active version.
-- The form gets re-versioned in Form Builder from time to time; if a future version replaces
-- this one, both this uuid and every concept uuid below need to be re-checked against whatever
-- concepts the new version actually uses, the same way this fix was derived.
JOIN form f ON f.form_id = e.form_id AND f.uuid = '62f41812-6614-4a65-b6fb-524175aeeccb'
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs fullNameObs ON fullNameObs.encounter_id = e.encounter_id AND fullNameObs.voided = 0
  AND fullNameObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'bdcb4bde-5a99-4d40-9847-cb7b4fe0deb1')
LEFT JOIN obs ageObs ON ageObs.encounter_id = e.encounter_id AND ageObs.voided = 0
  AND ageObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ea3c8357-2587-491b-8a8e-ddf7b481e265')
LEFT JOIN obs genderObs ON genderObs.encounter_id = e.encounter_id AND genderObs.voided = 0
  AND genderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7e6e3c52-349d-4e3b-b3d4-013de78dfe26')
LEFT JOIN concept genderAnswer ON genderAnswer.concept_id = genderObs.value_coded
LEFT JOIN obs referralDateObs ON referralDateObs.encounter_id = e.encounter_id AND referralDateObs.voided = 0
  AND referralDateObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '5cddd41f-42f2-49ef-97f9-84ae43195401')
LEFT JOIN obs referralTimeObs ON referralTimeObs.encounter_id = e.encounter_id AND referralTimeObs.voided = 0
  AND referralTimeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'df9ea0dd-cce0-4403-92af-55e8547a38df')
LEFT JOIN obs nationalIdObs ON nationalIdObs.encounter_id = e.encounter_id AND nationalIdObs.voided = 0
  AND nationalIdObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '2fb9ed2f-2e35-4f2d-b5c3-888fe43f477e')
LEFT JOIN obs phoneNumberObs ON phoneNumberObs.encounter_id = e.encounter_id AND phoneNumberObs.voided = 0
  AND phoneNumberObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7c6718e0-9d0d-4e80-b979-33f6b0ca8a63')
LEFT JOIN obs referringFacilityObs ON referringFacilityObs.encounter_id = e.encounter_id AND referringFacilityObs.voided = 0
  AND referringFacilityObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'a3dfb45b-0bf5-4236-98bc-5bc5ffd6a513')
LEFT JOIN obs referredToObs ON referredToObs.encounter_id = e.encounter_id AND referredToObs.voided = 0
  AND referredToObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'daafe4cf-9529-4819-a234-9fd498c9de46')
LEFT JOIN obs urgencyObs ON urgencyObs.encounter_id = e.encounter_id AND urgencyObs.voided = 0
  AND urgencyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '8dc170ce-92ab-4431-9685-dbb446e55ff5')
LEFT JOIN obs transportationObs ON transportationObs.encounter_id = e.encounter_id AND transportationObs.voided = 0
  AND transportationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c55f423f-59c9-4a41-9874-60cf19f42f70')
LEFT JOIN obs referralCauseObs ON referralCauseObs.encounter_id = e.encounter_id AND referralCauseObs.voided = 0
  AND referralCauseObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'fedcd191-6c71-4254-bc6e-5cc343199365')
LEFT JOIN obs clinicalHistoryObs ON clinicalHistoryObs.encounter_id = e.encounter_id AND clinicalHistoryObs.voided = 0
  AND clinicalHistoryObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '19d5eeb7-f480-4ba5-9bc3-d153a8bbfcc8')
LEFT JOIN obs managementReceivedObs ON managementReceivedObs.encounter_id = e.encounter_id AND managementReceivedObs.voided = 0
  AND managementReceivedObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '4fb059b2-0a98-47be-8fbf-c89fcde87e40')
LEFT JOIN obs referringDoctorObs ON referringDoctorObs.encounter_id = e.encounter_id AND referringDoctorObs.voided = 0
  AND referringDoctorObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7f323dd1-7f2d-41dd-a2cf-b8f8e0a3960d')
LEFT JOIN obs headOfClinicObs ON headOfClinicObs.encounter_id = e.encounter_id AND headOfClinicObs.voided = 0
  AND headOfClinicObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'fa28dc00-6ddd-46bd-9209-35e28f480868')
LEFT JOIN obs feedbackObs ON feedbackObs.encounter_id = e.encounter_id AND feedbackObs.voided = 0
  AND feedbackObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'd593ee86-6aa0-430b-bd27-4f6400e1c047')
LEFT JOIN obs followUpObs ON followUpObs.encounter_id = e.encounter_id AND followUpObs.voided = 0
  AND followUpObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'fc23ccd6-4845-4dea-a10f-021b51923858')
LEFT JOIN obs treatingDoctorObs ON treatingDoctorObs.encounter_id = e.encounter_id AND treatingDoctorObs.voided = 0
  AND treatingDoctorObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7c2100fc-3086-4f41-819c-4f6143edc8f5')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
ORDER BY e.encounter_datetime DESC
