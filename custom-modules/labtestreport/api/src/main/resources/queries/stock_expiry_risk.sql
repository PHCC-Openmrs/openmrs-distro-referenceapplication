-- Batches with a known expiry and stock still on hand, with how long they have left.
--
-- Only COMPLETED, non-voided operations count, matching stock_ledger_report.sql and
-- stock_current_onhand.sql - so a batch already emptied by an approved Disposal or Transfer Out
-- drops out of the HAVING clause below, while one drawn down only by a transfer still awaiting
-- approval correctly still shows as at risk.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  sb.batch_no      AS batchNo,
  sb.expiration    AS expirationDate,
  SUM(sit.quantity * puom.factor) AS remainingQty,
  DATEDIFF(sb.expiration, CURDATE()) AS daysUntilExpiry,
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
  AND sb.expiration IS NOT NULL
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND (:daysAhead IS NULL OR DATEDIFF(sb.expiration, CURDATE()) <= :daysAhead)
GROUP BY si.stock_item_id, si.common_name, p.party_id, l.name, sb.batch_no, sb.expiration, un.name, bun.name, bulk.factor
HAVING remainingQty > 0
ORDER BY daysUntilExpiry ASC
