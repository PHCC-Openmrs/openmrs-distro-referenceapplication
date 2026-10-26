-- Quantity left in each batch at each location now - the batch-level breakdown of
-- stock_current_onhand.sql. Deliberately not date-filtered: it is a "balance today" figure.
--
-- Unlike stock_expiry_risk.sql this keeps batches with no expiration date recorded, and unlike
-- stock_current_onhand.sql it does not split off expired stock: a batch balance is what is
-- physically on the shelf, so an expired batch that has not been disposed of yet still shows, with
-- its expiry date so the consumer can flag it.
--
-- Grouped by stock_batch_id rather than batch_no, so two batches of an item that happen to share a
-- batch number (e.g. re-received with a different expiry) stay separate rows.
--
-- Only COMPLETED, non-voided operations count, matching stock_ledger_report.sql and
-- stock_current_onhand.sql. Every batch that has had a completed movement at a location is listed,
-- including ones drawn down to zero, so a storekeeper can see a batch has been used up rather than
-- wonder whether it was ever received. Negative balances stay visible too - a batch drawn below
-- zero is a data problem worth seeing.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  sb.stock_batch_id AS stockBatchId,
  sb.batch_no      AS batchNo,
  sb.expiration    AS expirationDate,
  SUM(sit.quantity * puom.factor) AS quantity,
  un.name          AS unitName,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
WHERE si.voided = 0
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
GROUP BY si.stock_item_id, si.common_name, p.party_id, l.name, sb.stock_batch_id, sb.batch_no, sb.expiration,
         un.name, bun.name, bulk.factor
ORDER BY si.common_name, sb.batch_no, l.name
