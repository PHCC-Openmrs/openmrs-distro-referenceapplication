-- Reproductive Health Activity Report: one row per countable event, tagged with the report row
-- (indicatorKey) it counts towards plus the patient's age group and gender at the time. The
-- service pivots these into the age-group x gender grid, and filters the very same rows for a
-- cell's drill-down, so a count and the patients behind it can never disagree.
--
-- Three kinds of event:
--   * SRH section answers -- every select-type SRH field stores its chosen option as free text
--     (see srh_report.sql), so srh_indicator_map pairs each report row with the concept + option
--     text that counts towards it. One event per encounter, i.e. per visit recorded.
--   * pediatricCases -- one event per unique patient enrolled in the Pediatric Consultation
--     program during the period, aged at their first such enrolment.
--   * totalPatients -- one event per unique patient with any SRH section recorded during the
--     period, aged at their first such encounter.
--
-- With a location selected, SRH encounters are matched on the encounter's location and pediatric
-- enrolments on the enrolment's location.
WITH srh_indicator_map AS (
  -- SRH Assessment > ANC
  SELECT 'ancFirstVisitBeforeFirstTrimester' AS indicator_key, 'd2c7f668-6b1e-4582-aef3-5df79c45fb84' AS concept_uuid, 'First antenatal visit < 1st trimester' AS value_text
  UNION ALL SELECT 'ancFirstVisitAfterFirstTrimester', 'd2c7f668-6b1e-4582-aef3-5df79c45fb84', 'First antenatal visit > 1st trimester'
  UNION ALL SELECT 'ancSecondVisit',                   'd2c7f668-6b1e-4582-aef3-5df79c45fb84', 'Second antenatal visit'
  UNION ALL SELECT 'ancThirdVisit',                    'd2c7f668-6b1e-4582-aef3-5df79c45fb84', 'Third antenatal visit'
  UNION ALL SELECT 'ancFourOrMoreVisits',              'd2c7f668-6b1e-4582-aef3-5df79c45fb84', 'Four or more antenatal visits'
  -- STI and Gyna > PNC / STI / Gyna / PCC
  UNION ALL SELECT 'pncWithin72Hours',                 '9311d1f3-ec8b-41a7-9893-fe8f3071c792', '<72 H'
  UNION ALL SELECT 'pncAfter72Hours',                  '9311d1f3-ec8b-41a7-9893-fe8f3071c792', '>72 H'
  UNION ALL SELECT 'stisTreated',                      '22199eac-e76a-47b5-81b3-75e969b01468', 'Yes'
  UNION ALL SELECT 'gynecologicalCases',               '1d1b1ebe-fa60-4f17-8ba2-c75830944a82', 'Yes'
  UNION ALL SELECT 'preConceptionCare',                '98018a2e-f03d-48ad-a002-a95f0e52f010', 'Yes'
  -- Ultrasound > Referrals
  UNION ALL SELECT 'ancCasesReferred',                 '26bcbe57-ac91-4763-a249-1e530acb237f', 'ANC cases'
  UNION ALL SELECT 'deliveriesReferred',               '26bcbe57-ac91-4763-a249-1e530acb237f', 'Deliveries'
  UNION ALL SELECT 'newbornsReferred',                 '26bcbe57-ac91-4763-a249-1e530acb237f', 'Newborns'
  -- Family Planning > Visit Type / Kind of Contraception
  UNION ALL SELECT 'fpNewVisit',                       '0ea3ad8b-1e24-461a-b421-093b078af199', 'New'
  UNION ALL SELECT 'fpRevisit',                        '0ea3ad8b-1e24-461a-b421-093b078af199', 'Follow'
  UNION ALL SELECT 'fpCocp',                           '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'COCP'
  UNION ALL SELECT 'fpPop',                            '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'POP'
  UNION ALL SELECT 'fpEmergencyContraceptives',        '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'Emergency contraceptives'
  UNION ALL SELECT 'fpInjectable',                     '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'Injectable'
  UNION ALL SELECT 'fpMaleCondom',                     '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'Male Condom'
  UNION ALL SELECT 'fpIucd',                           '11b4fb9c-97f1-4ca8-bfe6-63e769cee6fb', 'IUCD'
),
srh_encounters AS (
  SELECT e.encounter_id, e.patient_id, e.encounter_datetime
  FROM encounter e
  JOIN encounter_type et ON et.encounter_type_id = e.encounter_type
    AND et.uuid IN (
      '20f20572-92d4-4cd2-a800-6dff5d39b044', -- SRH Assessment
      '367f7663-1ec7-4802-befc-b5097cee30b1', -- SRH Ultrasound
      '871dd5ad-4d3a-4170-a985-181d10394c44', -- SRH STI and Gynaecology
      '9602cc2d-f411-4318-87dd-7ab3a204127e'  -- SRH Family Planning
    )
  WHERE e.voided = 0
    AND (:startDate IS NULL OR e.encounter_datetime >= :startDate)
    AND (:endDate IS NULL OR e.encounter_datetime < DATE_ADD(:endDate, INTERVAL 1 DAY))
    AND (:locationUuid IS NULL OR e.location_id = (SELECT location_id FROM location WHERE uuid = :locationUuid))
),
events AS (
  -- DISTINCT so an encounter that somehow carries the same answer twice still counts as one visit.
  SELECT DISTINCT im.indicator_key, se.encounter_id, se.patient_id, se.encounter_datetime AS event_date
  FROM srh_encounters se
  JOIN obs o ON o.encounter_id = se.encounter_id AND o.voided = 0
  JOIN concept c ON c.concept_id = o.concept_id
  JOIN srh_indicator_map im ON im.concept_uuid = c.uuid AND im.value_text = o.value_text
  UNION ALL
  SELECT 'pediatricCases', NULL, pp.patient_id, MIN(pp.date_enrolled)
  FROM patient_program pp
  JOIN program pr ON pr.program_id = pp.program_id
    AND pr.uuid = '9138885e-f9f4-4981-b1fb-ef3d022228bd' -- Pediatric Consultation
  WHERE pp.voided = 0
    AND (:startDate IS NULL OR pp.date_enrolled >= :startDate)
    AND (:endDate IS NULL OR pp.date_enrolled < DATE_ADD(:endDate, INTERVAL 1 DAY))
    AND (:locationUuid IS NULL OR pp.location_id = (SELECT location_id FROM location WHERE uuid = :locationUuid))
  GROUP BY pp.patient_id
  UNION ALL
  SELECT 'totalPatients', NULL, se.patient_id, MIN(se.encounter_datetime)
  FROM srh_encounters se
  GROUP BY se.patient_id
)
SELECT
  ev.indicator_key AS indicatorKey,
  ev.patient_id    AS patientId,
  CASE
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, ev.event_date) BETWEEN 0  AND 4  THEN '0-4'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, ev.event_date) BETWEEN 5  AND 14 THEN '5-14'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, ev.event_date) BETWEEN 15 AND 18 THEN '15-18'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, ev.event_date) BETWEEN 19 AND 49 THEN '19-49'
    WHEN TIMESTAMPDIFF(YEAR, p.birthdate, ev.event_date) BETWEEN 50 AND 65 THEN '50-65'
    ELSE '65+'
  END              AS ageGroup,
  p.gender         AS gender
FROM events ev
JOIN person p ON p.person_id = ev.patient_id AND p.voided = 0
