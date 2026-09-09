-- Quantity disposed of at each location. A Disposal writes a single negative transaction at its
-- source location, so this is the outflow the Stock Ledger also shows in its Outgoing column.
--
-- Only COMPLETED, non-voided operations count, and rows are dated by the operation date rather
-- than by date_created - the same rule stock_ledger_report.sql applies, so the two cross-foot.
-- A cancelled operation would otherwise contribute both its original transaction and the
-- compensating one written on cancellation, and an operation voided after the fact could not be
-- excluded at all, stockmgmt_stock_item_transaction having no voided column of its own.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  SUM(-sit.quantity * puom.factor) AS quantity,
  un.name          AS unitName,
  CAST(NULL AS CHAR(255)) AS sourceLocationName,
  -- Balance held right now, so deliberately not date-filtered - but held to the same
  -- COMPLETED-and-not-voided rule as the disposed quantity above, or the two columns of one row
  -- would be counting different sets of operations.
  (SELECT COALESCE(SUM(sit2.quantity * puom2.factor), 0)
   FROM stockmgmt_stock_item_transaction sit2
   JOIN stockmgmt_stock_item_packaging_uom puom2 ON puom2.stock_item_packaging_uom_id = sit2.stock_item_packaging_uom_id
   JOIN stockmgmt_stock_operation so2 ON so2.stock_operation_id = sit2.stock_operation_id
   WHERE sit2.stock_item_id = si.stock_item_id AND sit2.party_id = p.party_id
     AND so2.status = 'COMPLETED'
     AND COALESCE(so2.voided, 0) = 0) AS remainingQty,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
WHERE si.voided = 0
  AND sot.operation_type = 'disposed'
  AND sit.quantity < 0
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND (:startDate IS NULL OR DATE(so.operation_date) >= :startDate)
  AND (:endDate IS NULL OR DATE(so.operation_date) < DATE_ADD(:endDate, INTERVAL 1 DAY))
GROUP BY si.stock_item_id, si.common_name, p.party_id, l.name, un.name, bun.name, bulk.factor
ORDER BY quantity DESC
