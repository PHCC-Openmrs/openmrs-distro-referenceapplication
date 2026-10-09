-- One row per drug order (prescription): which medicine was prescribed to which patient, at what
-- dose, frequency, route and duration, and how much of it pharmacy actually dispensed.
--
-- DISCONTINUE orders are skipped: they only stop an earlier order and carry no dosing of their own,
-- so counting them would double-count the medicine. REVISE orders are kept, since each one is a
-- fresh prescription with its own dose/duration.
--
-- Dispensing lives in medication_dispense, one row per hand-over (an order can be dispensed in more
-- than one go, or refused). dispensedQuantity only sums the Completed hand-overs; dispenseStatus is
-- the status of the most recent hand-over, or NULL when pharmacy has not acted on the order yet.
SELECT
  p.person_id                      AS patientId,
  p.uuid                           AS patientUuid,
  COALESCE(pn.given_name, '')      AS givenName,
  COALESCE(pn.middle_name, '')     AS middleName,
  COALESCE(pn.family_name, '')     AS familyName,
  o.order_id                       AS orderId,
  o.date_activated                 AS dateActivated,
  l.name                           AS location,
  TIMESTAMPDIFF(YEAR, p.birthdate, o.date_activated) AS age,
  CASE p.gender
    WHEN 'M' THEN 'Male'
    WHEN 'F' THEN 'Female'
    WHEN 'O' THEN 'Other'
    ELSE NULL
  END                              AS gender,
  -- Scalar subquery (rather than a plain join) so a patient with more than one non-voided
  -- National ID doesn't fan this order out into duplicate rows.
  (SELECT pi_nid.identifier
     FROM patient_identifier pi_nid
    WHERE pi_nid.patient_id = p.person_id AND pi_nid.voided = 0
      AND pi_nid.identifier_type = (SELECT patient_identifier_type_id FROM patient_identifier_type WHERE name = 'National ID')
    ORDER BY pi_nid.preferred DESC, pi_nid.patient_identifier_id
    LIMIT 1)                        AS nationalId,
  d.drug_id                        AS drugId,
  -- Orders placed against a concept only (no drug formulation) fall back to the concept name.
  COALESCE(d.name, drugConceptName.name) AS drugName,
  do.dose                          AS dose,
  doseUnitsName.name               AS doseUnits,
  frequencyName.name               AS frequency,
  routeName.name                   AS route,
  do.duration                      AS duration,
  durationUnitsName.name           AS durationUnits,
  do.quantity                      AS quantityPrescribed,
  quantityUnitsName.name           AS quantityUnits,
  do.as_needed                     AS asNeeded,
  do.dosing_instructions           AS dosingInstructions,
  (SELECT SUM(md.quantity)
     FROM medication_dispense md
    WHERE md.drug_order_id = o.order_id AND md.voided = 0
      AND md.status = (SELECT concept_id FROM concept WHERE uuid = '1267AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
  )                                AS quantityDispensed,
  (SELECT statusName.name
     FROM medication_dispense md
     JOIN concept_name statusName ON statusName.concept_id = md.status
       AND statusName.voided = 0 AND statusName.locale = 'en' AND statusName.locale_preferred = 1
    WHERE md.drug_order_id = o.order_id AND md.voided = 0
    ORDER BY COALESCE(md.date_handed_over, md.date_created) DESC, md.medication_dispense_id DESC
    LIMIT 1)                        AS dispenseStatus,
  -- Staff accounts are often saved without a name flagged preferred (only patients get that from
  -- registration), so take the preferred name if there is one, else any non-voided name, else the
  -- provider's own name field.
  COALESCE(
    (SELECT NULLIF(TRIM(CONCAT(COALESCE(prescriberName.given_name, ''), ' ', COALESCE(prescriberName.family_name, ''))), '')
       FROM person_name prescriberName
      WHERE prescriberName.person_id = pr.person_id AND prescriberName.voided = 0
      ORDER BY prescriberName.preferred DESC, prescriberName.person_name_id
      LIMIT 1),
    NULLIF(TRIM(pr.name), '')
  )                                AS prescriber,
  -- Scalar subquery for the same reason as nationalId: one row per order even if the patient has
  -- more than one non-voided phone attribute. Matched by the UUID the registration form writes to
  -- (named "Telephone Number" in the reference dictionary) as well as by the "Phone Number" name
  -- the other reports use.
  (SELECT pa_phone.value
     FROM person_attribute pa_phone
    WHERE pa_phone.person_id = p.person_id AND pa_phone.voided = 0
      AND pa_phone.person_attribute_type_id IN (SELECT person_attribute_type_id FROM person_attribute_type
                                                 WHERE uuid = '14d4f066-15f5-102d-96e4-000c29c2a5d7' OR name = 'Phone Number')
    ORDER BY pa_phone.person_attribute_id DESC
    LIMIT 1)                        AS phoneNumber
FROM drug_order do
JOIN orders o ON o.order_id = do.order_id
JOIN person p ON p.person_id = o.patient_id
LEFT JOIN person_name pn ON pn.person_id = p.person_id AND pn.voided = 0 AND pn.preferred = 1
LEFT JOIN encounter e ON e.encounter_id = o.encounter_id
LEFT JOIN location l ON l.location_id = e.location_id
LEFT JOIN drug d ON d.drug_id = do.drug_inventory_id
LEFT JOIN concept_name drugConceptName ON drugConceptName.concept_id = o.concept_id
  AND drugConceptName.voided = 0 AND drugConceptName.locale = 'en' AND drugConceptName.locale_preferred = 1
LEFT JOIN concept_name doseUnitsName ON doseUnitsName.concept_id = do.dose_units
  AND doseUnitsName.voided = 0 AND doseUnitsName.locale = 'en' AND doseUnitsName.locale_preferred = 1
LEFT JOIN order_frequency ofr ON ofr.order_frequency_id = do.frequency
LEFT JOIN concept_name frequencyName ON frequencyName.concept_id = ofr.concept_id
  AND frequencyName.voided = 0 AND frequencyName.locale = 'en' AND frequencyName.locale_preferred = 1
LEFT JOIN concept_name routeName ON routeName.concept_id = do.route
  AND routeName.voided = 0 AND routeName.locale = 'en' AND routeName.locale_preferred = 1
LEFT JOIN concept_name durationUnitsName ON durationUnitsName.concept_id = do.duration_units
  AND durationUnitsName.voided = 0 AND durationUnitsName.locale = 'en' AND durationUnitsName.locale_preferred = 1
LEFT JOIN concept_name quantityUnitsName ON quantityUnitsName.concept_id = do.quantity_units
  AND quantityUnitsName.voided = 0 AND quantityUnitsName.locale = 'en' AND quantityUnitsName.locale_preferred = 1
LEFT JOIN provider pr ON pr.provider_id = o.orderer
WHERE o.voided = 0
  AND o.order_action <> 'DISCONTINUE'
  AND (:startDate IS NULL OR o.date_activated >= :startDate)
  AND (:endDate IS NULL OR o.date_activated < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY o.date_activated DESC, o.order_id DESC
