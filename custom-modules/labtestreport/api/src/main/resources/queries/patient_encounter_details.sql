SELECT
  p.person_id                  AS patientId,
  p.uuid                       AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.family_name, '') AS familyName,
  v.visit_id                    AS visitId,
  v.date_started                AS visitDate,
  COALESCE(l.name, '')          AS locationName,
  COALESCE(GROUP_CONCAT(DISTINCT COALESCE(pv.name, TRIM(CONCAT(pvpn.given_name, ' ', pvpn.family_name))) SEPARATOR ', '), '') AS providerName,
  GROUP_CONCAT(DISTINCT pr.name ORDER BY pr.name SEPARATOR ', ') AS serviceType
FROM visit v
JOIN patient pt ON pt.patient_id = v.patient_id
JOIN person p   ON p.person_id = pt.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN location l ON l.location_id = v.location_id
LEFT JOIN encounter e ON e.visit_id = v.visit_id AND e.voided = 0
LEFT JOIN encounter_provider ep ON ep.encounter_id = e.encounter_id AND ep.voided = 0
LEFT JOIN provider pv ON pv.provider_id = ep.provider_id
LEFT JOIN person_name pvpn ON pvpn.person_id = pv.person_id AND pvpn.voided = 0 AND pvpn.preferred = 1
-- Which of the four service-type programs, if any, this particular visit belongs to.
-- NOTE: duplicated from patient_encounter_summary.sql, which needs the same resolution but
-- aggregated across all of a patient's visits rather than kept per visit as it is here. Keep the
-- two in sync -- see SqlResources: these query files are loaded as plain text, with no include
-- mechanism to factor the join out into one place.
LEFT JOIN patient_program pp
  ON pp.patient_id = pt.patient_id AND pp.voided = 0
  AND pp.date_enrolled <= COALESCE(v.date_stopped, :endDate, NOW())
  AND (pp.date_completed IS NULL OR pp.date_completed >= v.date_started)
  AND (:startDate IS NULL OR pp.date_completed IS NULL OR pp.date_completed >= :startDate)
  AND (:endDate IS NULL OR pp.date_enrolled < DATE_ADD(:endDate, INTERVAL 1 DAY))
LEFT JOIN program pr
  ON pr.program_id = pp.program_id
  AND pr.uuid IN (
    '2433ebba-8ffb-11f1-a103-1afee95a890c', -- Nutrition Registration
    'f73376c9-7bdf-44e5-ba97-ddf4db5bc9f9', -- Sexual Reproductive Health (SRH)
    'bd6b8c0a-49c9-4f98-afea-8b8fcd999688', -- Primary Health Care
    '9138885e-f9f4-4981-b1fb-ef3d022228bd'  -- Pediatric Consultation
  )
WHERE v.voided = 0
  AND (:startDate IS NULL OR v.date_started >= :startDate)
  AND (:endDate IS NULL OR v.date_started < DATE_ADD(:endDate, INTERVAL 1 DAY))
GROUP BY p.person_id, p.uuid, pn.given_name, pn.family_name, v.visit_id, v.date_started, l.name
ORDER BY familyName, givenName, v.date_started
