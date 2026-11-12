-- Patient details for a Reproductive Health Activity Report drill-down. The service has already
-- worked out which patients sit behind the clicked cell (from rh_activity_report_events.sql), so
-- this only resolves their display columns, in the same shape as patients_for_ewars_cell.sql.
SELECT
  p.person_id                  AS patientId,
  p.uuid                       AS patientUuid,
  COALESCE(pn.given_name, '')  AS givenName,
  COALESCE(pn.family_name, '') AS familyName,
  -- Scalar subqueries (rather than plain joins) so a patient with more than one non-voided
  -- identifier/phone number doesn't appear twice in the list.
  (SELECT pi.identifier
     FROM patient_identifier pi
    WHERE pi.patient_id = p.person_id AND pi.voided = 0
    ORDER BY pi.preferred DESC, pi.patient_identifier_id
    LIMIT 1)                   AS identifier,
  p.gender                     AS sex,
  (SELECT pi_nid.identifier
     FROM patient_identifier pi_nid
    WHERE pi_nid.patient_id = p.person_id AND pi_nid.voided = 0
      AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
    ORDER BY pi_nid.preferred DESC, pi_nid.patient_identifier_id
    LIMIT 1)                   AS nationalId,
  (SELECT pa_phone.value
     FROM person_attribute pa_phone
    WHERE pa_phone.person_id = p.person_id AND pa_phone.voided = 0
      AND pa_phone.person_attribute_type_id = (SELECT person_attribute_type_id FROM person_attribute_type WHERE name = 'Phone Number')
    ORDER BY pa_phone.person_attribute_id
    LIMIT 1)                   AS phoneNumber,
  COALESCE(pn.middle_name, '') AS middleName
FROM person p
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
WHERE p.person_id IN (:patientIds)
ORDER BY familyName, givenName
