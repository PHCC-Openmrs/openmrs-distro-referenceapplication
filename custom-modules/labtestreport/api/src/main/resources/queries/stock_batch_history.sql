-- Everything that ever happened to a batch: one row per stock transaction, oldest first, so a
-- storekeeper can follow a batch from the day it was received through every transfer, issue,
-- dispense, disposal and adjustment, at every location that held it. Not date-filtered on
-- purpose - the consumer needs the rows before a chosen range to work out the balance the range
-- opened with, the same carry-in stock_ledger_report.sql computes in SQL.
--
-- Only COMPLETED, non-voided operations count, matching stock_ledger_report.sql and
-- stock_batch_balance.sql, so the history of a batch at a location sums to exactly the balance the
-- Batch Balance report shows for it. A cancelled Transfer Out would otherwise contribute both its
-- submit-time debit and the compensating credit written on cancellation.
--
-- activity names what the movement was from this location's point of view. A two-legged operation
-- (Transfer Out, Stock Issue, Return) writes a debit at its source and a credit at its destination
-- on the one operation, so the leg's sign tells the sending side from the receiving side. A
-- dispense is a Stock Issue that carries the patient it was dispensed to, which is the only thing
-- that tells it apart from an issue to a location.
SELECT
  sit.stock_item_transaction_id AS transactionId,
  so.operation_date       AS operationDate,
  so.operation_number     AS operationNumber,
  so.uuid                 AS operationUuid,
  CASE
    WHEN sit.patient_id IS NOT NULL THEN 'DISPENSED'
    WHEN sot.operation_type = 'initial' THEN 'OPENING_STOCK'
    WHEN sot.operation_type = 'receipt' THEN 'RECEIVED'
    WHEN sot.operation_type = 'transferout' THEN IF(sit.quantity < 0, 'TRANSFERRED_OUT', 'TRANSFERRED_IN')
    WHEN sot.operation_type = 'stockissue' THEN IF(sit.quantity < 0, 'ISSUED', 'ISSUE_RECEIVED')
    WHEN sot.operation_type = 'return' THEN IF(sit.quantity < 0, 'RETURNED', 'RETURN_RECEIVED')
    WHEN sot.operation_type = 'disposed' THEN 'DISPOSED'
    WHEN sot.operation_type = 'adjustment' THEN 'ADJUSTED'
    WHEN sot.operation_type = 'stocktake' THEN 'STOCK_TAKE'
    ELSE UPPER(sot.operation_type)
  END                     AS activity,
  si.stock_item_id        AS stockItemId,
  si.common_name          AS itemName,
  sb.stock_batch_id       AS stockBatchId,
  sb.batch_no             AS batchNo,
  sb.expiration           AS expirationDate,
  p.party_id              AS locationId,
  l.uuid                  AS locationUuid,
  l.name                  AS locationName,
  -- The other side of the movement: where a transfer went to or came from, or the vendor a receipt
  -- came from. NULL for one-sided operations (adjustment, disposal, opening stock, dispense).
  COALESCE(cl.name, css.name) AS counterpartName,
  NULLIF(CONCAT_WS(' ', ptn.given_name, ptn.family_name), '') AS patientName,
  -- Signed: positive is stock arriving at this location, negative is stock leaving it.
  sit.quantity * puom.factor AS quantity,
  rn.name                 AS reasonName,
  -- Who recorded the movement. The transaction's creator rather than the operation's
  -- responsible person, which most operation types never ask for.
  COALESCE(NULLIF(CONCAT_WS(' ', crn.given_name, crn.family_name), ''), cu.username) AS recordedBy,
  un.name                 AS unitName,
  bun.name                AS bulkUnitName,
  bulk.factor             AS bulkFactor
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
-- The operation's other party: its destination when this leg is at the source, otherwise its source.
LEFT JOIN stockmgmt_party cp ON cp.party_id = CASE WHEN sit.party_id = so.source_id THEN so.destination_id ELSE so.source_id END
  AND cp.party_id <> sit.party_id
LEFT JOIN location cl ON cl.location_id = cp.location_id
LEFT JOIN stockmgmt_stock_source css ON css.stock_source_id = cp.stock_source_id
LEFT JOIN person_name ptn ON ptn.person_name_id = (
  SELECT pn2.person_name_id FROM person_name pn2
  WHERE pn2.person_id = sit.patient_id AND pn2.voided = 0
  ORDER BY pn2.preferred DESC, pn2.person_name_id
  LIMIT 1
)
LEFT JOIN users cu ON cu.user_id = sit.creator
-- Users created through the admin pages often have a single name never flagged preferred - see
-- stock_adjustments.sql.
LEFT JOIN person_name crn ON crn.person_name_id = (
  SELECT pn3.person_name_id FROM person_name pn3
  WHERE pn3.person_id = cu.person_id AND pn3.voided = 0
  ORDER BY pn3.preferred DESC, pn3.person_name_id
  LIMIT 1
)
LEFT JOIN concept_name rn ON rn.concept_id = so.reason_id AND rn.locale = 'en' AND rn.locale_preferred = 1
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
WHERE si.voided = 0
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:stockItemId IS NULL OR sit.stock_item_id = :stockItemId)
  AND (:stockBatchId IS NULL OR sit.stock_batch_id = :stockBatchId)
-- Within one operation the sending leg comes first, so a transfer reads "out" then "in".
ORDER BY so.operation_date, so.stock_operation_id, sit.quantity, sit.stock_item_transaction_id
