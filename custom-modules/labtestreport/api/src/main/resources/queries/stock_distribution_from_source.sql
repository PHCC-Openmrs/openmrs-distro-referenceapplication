-- Quantity transferred out of a source location, grouped by the destination that received it.
-- A Transfer Out writes its source debit when the operation is submitted and its destination
-- credit when it completes, both on the same operation; `sit.party_id != so.source_id` with
-- `quantity > 0` picks the destination leg.
--
-- Only COMPLETED, non-voided operations count, and rows are dated by the operation date rather
-- than by date_created - the same rule stock_ledger_report.sql applies, so the two cross-foot.
-- Requiring COMPLETED is what makes this report show only transfers that actually arrived: a
-- submitted-but-unapproved transfer has debited its source and has no destination leg yet, and a
-- cancelled one carries both its debit and the compensating credit written on cancellation.
-- Because the two legs share one operation, they also share one operation date, so source and
-- destination are always reported in the same period.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  destP.party_id   AS locationId,
  destL.name       AS locationName,
  SUM(sit.quantity * puom.factor) AS quantity,
  un.name          AS unitName,
  srcL.name        AS sourceLocationName,
  -- Balance the destination holds right now, so deliberately not date-filtered - but held to the
  -- same COMPLETED-and-not-voided rule as the transferred quantity above, or the two columns of
  -- one row would be counting different sets of operations.
  (SELECT COALESCE(SUM(sit2.quantity * puom2.factor), 0)
   FROM stockmgmt_stock_item_transaction sit2
   JOIN stockmgmt_stock_item_packaging_uom puom2 ON puom2.stock_item_packaging_uom_id = sit2.stock_item_packaging_uom_id
   JOIN stockmgmt_stock_operation so2 ON so2.stock_operation_id = sit2.stock_operation_id
   WHERE sit2.stock_item_id = si.stock_item_id AND sit2.party_id = destP.party_id
     AND so2.status = 'COMPLETED'
     AND COALESCE(so2.voided, 0) = 0) AS remainingQty,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party srcP ON srcP.party_id = so.source_id
LEFT JOIN location srcL ON srcL.location_id = srcP.location_id
JOIN stockmgmt_party destP ON destP.party_id = sit.party_id
LEFT JOIN location destL ON destL.location_id = destP.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
WHERE si.voided = 0
  AND sot.operation_type = 'transferout'
  AND sit.quantity > 0
  AND sit.party_id != so.source_id
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:sourceLocationUuid IS NULL OR srcL.uuid = :sourceLocationUuid)
  AND (:startDate IS NULL OR DATE(so.operation_date) >= :startDate)
  AND (:endDate IS NULL OR DATE(so.operation_date) < DATE_ADD(:endDate, INTERVAL 1 DAY))
GROUP BY si.stock_item_id, si.common_name, destP.party_id, destL.name, un.name, srcL.name, bun.name, bulk.factor
ORDER BY quantity DESC
