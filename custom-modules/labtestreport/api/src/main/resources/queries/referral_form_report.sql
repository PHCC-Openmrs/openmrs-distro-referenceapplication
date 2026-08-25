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
  referralTimeObs.value_text       AS referralTime,
  patientIdObs.value_text          AS formPatientId,
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
JOIN form f ON f.form_id = e.form_id AND f.uuid = 'e579c366-88a7-4c14-b82b-a4b0fa26ce32'
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs fullNameObs ON fullNameObs.encounter_id = e.encounter_id AND fullNameObs.voided = 0
  AND fullNameObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '8985e636-1df5-473d-8d4b-022b2911c8c8')
LEFT JOIN obs ageObs ON ageObs.encounter_id = e.encounter_id AND ageObs.voided = 0
  AND ageObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '678172c5-c89b-4441-92bf-7bf00085206e')
LEFT JOIN obs genderObs ON genderObs.encounter_id = e.encounter_id AND genderObs.voided = 0
  AND genderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '7e6e3c52-349d-4e3b-b3d4-013de78dfe26')
LEFT JOIN concept genderAnswer ON genderAnswer.concept_id = genderObs.value_coded
LEFT JOIN obs referralDateObs ON referralDateObs.encounter_id = e.encounter_id AND referralDateObs.voided = 0
  AND referralDateObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c88e28ef-b4e5-4282-8bc2-0471a6e4df08')
LEFT JOIN obs referralTimeObs ON referralTimeObs.encounter_id = e.encounter_id AND referralTimeObs.voided = 0
  AND referralTimeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '46138de3-3f7d-4a1b-afff-145d13d059c9')
LEFT JOIN obs patientIdObs ON patientIdObs.encounter_id = e.encounter_id AND patientIdObs.voided = 0
  AND patientIdObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ccd77460-cb29-4e98-9399-e14562d7a1e4')
LEFT JOIN obs phoneNumberObs ON phoneNumberObs.encounter_id = e.encounter_id AND phoneNumberObs.voided = 0
  AND phoneNumberObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'd97745ea-a464-40b4-967d-130d4b85c599')
LEFT JOIN obs referringFacilityObs ON referringFacilityObs.encounter_id = e.encounter_id AND referringFacilityObs.voided = 0
  AND referringFacilityObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '312b4eb0-e8dd-462a-9234-6b77fad91352')
LEFT JOIN obs referredToObs ON referredToObs.encounter_id = e.encounter_id AND referredToObs.voided = 0
  AND referredToObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '5083fb0d-6451-4fed-981f-2f3a64485834')
LEFT JOIN obs urgencyObs ON urgencyObs.encounter_id = e.encounter_id AND urgencyObs.voided = 0
  AND urgencyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '959e3d64-500a-4f55-90fe-4158ec06741e')
LEFT JOIN obs transportationObs ON transportationObs.encounter_id = e.encounter_id AND transportationObs.voided = 0
  AND transportationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'f38337b8-3332-468f-ac53-c7698bbdd472')
LEFT JOIN obs referralCauseObs ON referralCauseObs.encounter_id = e.encounter_id AND referralCauseObs.voided = 0
  AND referralCauseObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '34318bec-7e4a-45b7-a445-3b0da0f3d2c7')
LEFT JOIN obs clinicalHistoryObs ON clinicalHistoryObs.encounter_id = e.encounter_id AND clinicalHistoryObs.voided = 0
  AND clinicalHistoryObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '58fdb0c4-dbc7-40ab-8636-d378ae33afc2')
LEFT JOIN obs managementReceivedObs ON managementReceivedObs.encounter_id = e.encounter_id AND managementReceivedObs.voided = 0
  AND managementReceivedObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'c7cc5b54-3129-43e0-ac15-6f59ba8592bf')
LEFT JOIN obs referringDoctorObs ON referringDoctorObs.encounter_id = e.encounter_id AND referringDoctorObs.voided = 0
  AND referringDoctorObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '197089f4-6c25-4ebc-911f-079ca9635311')
LEFT JOIN obs headOfClinicObs ON headOfClinicObs.encounter_id = e.encounter_id AND headOfClinicObs.voided = 0
  AND headOfClinicObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '87fa4451-4b34-4d20-9d88-59aba7a8cffd')
LEFT JOIN obs feedbackObs ON feedbackObs.encounter_id = e.encounter_id AND feedbackObs.voided = 0
  AND feedbackObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '23389a38-e3c2-443a-a9c1-07233aee54f4')
LEFT JOIN obs followUpObs ON followUpObs.encounter_id = e.encounter_id AND followUpObs.voided = 0
  AND followUpObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '9ae66fce-9592-4e48-90aa-aa26f7fad286')
LEFT JOIN obs treatingDoctorObs ON treatingDoctorObs.encounter_id = e.encounter_id AND treatingDoctorObs.voided = 0
  AND treatingDoctorObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ae3bd38e-f241-46c6-a4cb-430622158625')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
ORDER BY e.encounter_datetime DESC
