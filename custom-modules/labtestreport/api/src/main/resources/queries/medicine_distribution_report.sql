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
--
-- dispensedCost is what the stock that left the shelf for this order cost to buy. A dispense deducts
-- stock as separate transactions carrying the order_id (one per batch it drew from), and cancelling
-- or editing a dispense gives stock back as an Adjustment with the same order_id, so the net of an
-- order's patient transactions is what it really took. Each leg is priced by its own batch - the
-- price on the batch's Opening Stock line, else the item's default price, per dispensing unit (see
-- stock_batch_balance.sql). stockQuantity is that net in dispensing units; pricedQuantity is the
-- part of it that had a price, so the consumer can tell a partly-priced cost from a full one. All
-- three are NULL when no stock moved for the order (not dispensed yet, or dispensed with stock off).
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
    (SELECT NULLIF(TRIM(CONCAT_WS(' ', prescriberName.given_name, NULLIF(TRIM(prescriberName.middle_name), ''), prescriberName.family_name)), '')
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
    LIMIT 1)                        AS phoneNumber,
  -- Who handed the medicine over: the distinct dispensers across this order's non-voided dispense
  -- records (an order can be dispensed in several goes by different staff). Same name fallback as
  -- prescriber.
  (SELECT GROUP_CONCAT(DISTINCT COALESCE(
            (SELECT NULLIF(TRIM(CONCAT_WS(' ', dn.given_name, NULLIF(TRIM(dn.middle_name), ''), dn.family_name)), '')
               FROM person_name dn
              WHERE dn.person_id = dpr.person_id AND dn.voided = 0
              ORDER BY dn.preferred DESC, dn.person_name_id
              LIMIT 1),
            NULLIF(TRIM(dpr.name), ''))
          SEPARATOR ', ')
     FROM medication_dispense md
     JOIN provider dpr ON dpr.provider_id = md.dispenser
    WHERE md.drug_order_id = o.order_id AND md.voided = 0) AS dispensedBy,
  cost.stockQuantity               AS stockQuantity,
  cost.pricedQuantity              AS pricedQuantity,
  cost.dispensedCost               AS dispensedCost
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
-- Grouped once over the dispense transactions of orders in the date range, rather than looked up per row.
LEFT JOIN (
  SELECT
    sit.order_id,
    -SUM(sit.quantity * puom.factor) AS stockQuantity,
    -SUM(CASE WHEN COALESCE(bpi.purchase_price / bpu.factor, si.purchase_price / ipu.factor) IS NOT NULL
              THEN sit.quantity * puom.factor END) AS pricedQuantity,
    -SUM(sit.quantity * puom.factor * COALESCE(bpi.purchase_price / bpu.factor, si.purchase_price / ipu.factor)) AS dispensedCost
  FROM stockmgmt_stock_item_transaction sit
  JOIN orders so_order ON so_order.order_id = sit.order_id
  JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
  JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
  JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
  LEFT JOIN stockmgmt_stock_operation_item bpi ON bpi.stock_operation_item_id = (
    SELECT soi2.stock_operation_item_id
    FROM stockmgmt_stock_operation_item soi2
    JOIN stockmgmt_stock_operation so2 ON so2.stock_operation_id = soi2.stock_operation_id
    JOIN stockmgmt_stock_operation_type sot2 ON sot2.stock_operation_type_id = so2.operation_type_id
    JOIN stockmgmt_stock_item_packaging_uom pu2 ON pu2.stock_item_packaging_uom_id = soi2.stock_item_packaging_uom_id
    WHERE soi2.stock_batch_id = sit.stock_batch_id
      AND soi2.purchase_price IS NOT NULL
      AND pu2.factor > 0
      AND COALESCE(soi2.voided, 0) = 0
      AND sot2.operation_type IN ('initial', 'receipt')
      AND so2.status = 'COMPLETED'
      AND COALESCE(so2.voided, 0) = 0
    ORDER BY COALESCE(so2.completed_date, so2.operation_date), so2.stock_operation_id, soi2.stock_operation_item_id
    LIMIT 1
  )
  LEFT JOIN stockmgmt_stock_item_packaging_uom bpu ON bpu.stock_item_packaging_uom_id = bpi.stock_item_packaging_uom_id
  LEFT JOIN stockmgmt_stock_item_packaging_uom ipu ON ipu.stock_item_packaging_uom_id = si.purchase_price_uom_id
    AND ipu.factor > 0
  WHERE sit.patient_id IS NOT NULL
    AND so.status = 'COMPLETED'
    AND COALESCE(so.voided, 0) = 0
    AND (:startDate IS NULL OR so_order.date_activated >= :startDate)
    AND (:endDate IS NULL OR so_order.date_activated < DATE_ADD(:endDate, INTERVAL 1 DAY))
  GROUP BY sit.order_id
) cost ON cost.order_id = o.order_id
WHERE o.voided = 0
  AND o.order_action <> 'DISCONTINUE'
  AND (:startDate IS NULL OR o.date_activated >= :startDate)
  AND (:endDate IS NULL OR o.date_activated < DATE_ADD(:endDate, INTERVAL 1 DAY))
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
ORDER BY o.date_activated DESC, o.order_id DESC
