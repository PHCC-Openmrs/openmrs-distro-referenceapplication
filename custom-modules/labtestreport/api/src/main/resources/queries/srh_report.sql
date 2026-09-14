-- One row per SRH encounter, across all three SRH sections (Ultrasound, STI and Gynaecology,
-- Family Planning), with a `section` column saying which one the row came from.
--
-- Like the Nursing report, SRH records are written straight through the REST API by the SRH
-- program sections on the patient chart's summary dashboard -- there is no Form Builder form
-- behind them -- so this joins on encounter_type. Each encounter belongs to exactly one section,
-- so the obs columns belonging to the other two sections are always NULL on any given row; the
-- report UI shows one section at a time and only that section's columns.
--
-- Every select-type SRH field stores its chosen option as free text (the concepts are Text
-- datatype with fixed option lists in the frontend config, not coded answer sets), which is why
-- these read value_text rather than resolving a value_coded answer name.
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
  CASE et.uuid
    WHEN '367f7663-1ec7-4802-befc-b5097cee30b1' THEN 'ultrasound'
    WHEN '871dd5ad-4d3a-4170-a985-181d10394c44' THEN 'stiGynaecology'
    WHEN '9602cc2d-f411-4318-87dd-7ab3a204127e' THEN 'familyPlanning'
  END                              AS section,
  -- Ultrasound
  fetusesObs.value_text            AS fetuses,
  fetalHeartObs.value_text         AS fetalHeartPulsation,
  presentationObs.value_text       AS presentation,
  lieFetusesObs.value_text         AS lieFetuses,
  fetalGenderObs.value_text        AS fetalGender,
  femurLengthObs.value_numeric     AS femurLength,
  crownRumpObs.value_numeric       AS crownRumpLength,
  biparietalObs.value_numeric      AS biparietalDiameter,
  abdominalCircObs.value_numeric   AS abdominalCircumference,
  gestAgeWeeksObs.value_numeric    AS gestationalAgeWeeks,
  gestAgeDaysObs.value_numeric     AS gestationalAgeDays,
  placentaObs.value_text           AS placenta,
  amnioticFluidObs.value_text      AS amnioticFluid,
  eddObs.value_datetime            AS expectedDateOfDelivery,
  weeksSinceLmpObs.value_numeric   AS weeksSinceLmp,
  referralsObs.value_text          AS referrals,
  ultrasoundNotesObs.value_text    AS ultrasoundNotes,
  -- STI and Gynaecology
  pncObs.value_text                AS pncTiming,
  stiObs.value_text                AS sti,
  gynaecologyObs.value_text        AS gynaecology,
  preConceptionObs.value_text      AS preConceptionCare,
  stiGynaNotesObs.value_text       AS stiGynaecologyNotes,
  -- Family Planning
  fpVisitTypeObs.value_text        AS familyPlanningVisitType,
  contraceptionObs.value_text      AS contraceptionKind,
  fpNotesObs.value_text            AS familyPlanningNotes
FROM encounter e
JOIN encounter_type et ON et.encounter_type_id = e.encounter_type
  AND et.uuid IN (
    '367f7663-1ec7-4802-befc-b5097cee30b1',
    '871dd5ad-4d3a-4170-a985-181d10394c44',
    '9602cc2d-f411-4318-87dd-7ab3a204127e'
  )
JOIN person p ON p.person_id = e.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN obs fetusesObs ON fetusesObs.encounter_id = e.encounter_id AND fetusesObs.voided = 0
  AND fetusesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '1baaf8f0-7b59-40d5-8aec-1af2436be3a4')
LEFT JOIN obs fetalHeartObs ON fetalHeartObs.encounter_id = e.encounter_id AND fetalHeartObs.voided = 0
  AND fetalHeartObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'd31d549f-77f2-41fe-9463-d6f9cd5f39de')
LEFT JOIN obs presentationObs ON presentationObs.encounter_id = e.encounter_id AND presentationObs.voided = 0
  AND presentationObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '151f6ad3-83d6-4e99-8f9f-87253a569cbf')
LEFT JOIN obs lieFetusesObs ON lieFetusesObs.encounter_id = e.encounter_id AND lieFetusesObs.voided = 0
  AND lieFetusesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'e5b825c6-8d33-4493-9afd-0162944e3094')
LEFT JOIN obs fetalGenderObs ON fetalGenderObs.encounter_id = e.encounter_id AND fetalGenderObs.voided = 0
  AND fetalGenderObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'a8adc088-44db-4800-91d4-ed159666cea0')
LEFT JOIN obs femurLengthObs ON femurLengthObs.encounter_id = e.encounter_id AND femurLengthObs.voided = 0
  AND femurLengthObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '9ccb470d-4698-410c-80e8-ddf71626b9c8')
LEFT JOIN obs crownRumpObs ON crownRumpObs.encounter_id = e.encounter_id AND crownRumpObs.voided = 0
  AND crownRumpObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '1ccd71c9-7cff-4cb4-8250-f259c163a411')
LEFT JOIN obs biparietalObs ON biparietalObs.encounter_id = e.encounter_id AND biparietalObs.voided = 0
  AND biparietalObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'd7dd0030-62b3-4519-8e85-7d0cd65b5589')
LEFT JOIN obs abdominalCircObs ON abdominalCircObs.encounter_id = e.encounter_id AND abdominalCircObs.voided = 0
  AND abdominalCircObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'af646e85-e5f4-4b10-8a8b-5711c3de1022')
LEFT JOIN obs gestAgeWeeksObs ON gestAgeWeeksObs.encounter_id = e.encounter_id AND gestAgeWeeksObs.voided = 0
  AND gestAgeWeeksObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '93f1d86b-6937-4fa7-8698-a405a4d31b17')
LEFT JOIN obs gestAgeDaysObs ON gestAgeDaysObs.encounter_id = e.encounter_id AND gestAgeDaysObs.voided = 0
  AND gestAgeDaysObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'e0765aa2-90bb-41ea-a033-6c9ccf25ab8d')
LEFT JOIN obs placentaObs ON placentaObs.encounter_id = e.encounter_id AND placentaObs.voided = 0
  AND placentaObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '649772f8-7212-409b-bf63-fc0c20ecd80e')
LEFT JOIN obs amnioticFluidObs ON amnioticFluidObs.encounter_id = e.encounter_id AND amnioticFluidObs.voided = 0
  AND amnioticFluidObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '6f0229ef-ddf2-452b-ae74-e42cc2d900af')
LEFT JOIN obs eddObs ON eddObs.encounter_id = e.encounter_id AND eddObs.voided = 0
  AND eddObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '21eea22d-7aef-4238-8203-a987fbf08d35')
LEFT JOIN obs weeksSinceLmpObs ON weeksSinceLmpObs.encounter_id = e.encounter_id AND weeksSinceLmpObs.voided = 0
  AND weeksSinceLmpObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'ccb5e545-2c8e-4082-a9a0-fddc01a0f088')
LEFT JOIN obs referralsObs ON referralsObs.encounter_id = e.encounter_id AND referralsObs.voided = 0
  AND referralsObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '26bcbe57-ac91-4763-a249-1e530acb237f')
LEFT JOIN obs ultrasoundNotesObs ON ultrasoundNotesObs.encounter_id = e.encounter_id AND ultrasoundNotesObs.voided = 0
  AND ultrasoundNotesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '0983ec3a-3fdc-4398-a511-aaac695db09d')
LEFT JOIN obs pncObs ON pncObs.encounter_id = e.encounter_id AND pncObs.voided = 0
  AND pncObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '9311d1f3-ec8b-41a7-9893-fe8f3071c792')
LEFT JOIN obs stiObs ON stiObs.encounter_id = e.encounter_id AND stiObs.voided = 0
  AND stiObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '22199eac-e76a-47b5-81b3-75e969b01468')
LEFT JOIN obs gynaecologyObs ON gynaecologyObs.encounter_id = e.encounter_id AND gynaecologyObs.voided = 0
  AND gynaecologyObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '1d1b1ebe-fa60-4f17-8ba2-c75830944a82')
LEFT JOIN obs preConceptionObs ON preConceptionObs.encounter_id = e.encounter_id AND preConceptionObs.voided = 0
  AND preConceptionObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '98018a2e-f03d-48ad-a002-a95f0e52f010')
LEFT JOIN obs stiGynaNotesObs ON stiGynaNotesObs.encounter_id = e.encounter_id AND stiGynaNotesObs.voided = 0
  AND stiGynaNotesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'f0438e22-6224-4d50-8646-7b1845b122f8')
LEFT JOIN obs fpVisitTypeObs ON fpVisitTypeObs.encounter_id = e.encounter_id AND fpVisitTypeObs.voided = 0
  AND fpVisitTypeObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '0ea3ad8b-1e24-461a-b421-093b078af199')
LEFT JOIN obs contraceptionObs ON contraceptionObs.encounter_id = e.encounter_id AND contraceptionObs.voided = 0
  AND contraceptionObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb')
LEFT JOIN obs fpNotesObs ON fpNotesObs.encounter_id = e.encounter_id AND fpNotesObs.voided = 0
  AND fpNotesObs.concept_id = (SELECT concept_id FROM concept WHERE uuid = 'b1285f61-04ac-40a2-903f-994d2e2151c9')
WHERE e.voided = 0
  AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
  AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND (:section IS NULL OR et.uuid = CASE :section
    WHEN 'ultrasound' THEN '367f7663-1ec7-4802-befc-b5097cee30b1'
    WHEN 'stiGynaecology' THEN '871dd5ad-4d3a-4170-a985-181d10394c44'
    WHEN 'familyPlanning' THEN '9602cc2d-f411-4318-87dd-7ab3a204127e'
  END)
ORDER BY e.encounter_datetime DESC
