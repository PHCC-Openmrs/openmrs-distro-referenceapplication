-- Quantity each location holds now, split into what can actually be used and what has expired.
-- Deliberately not date-filtered - it is a "balance today" figure, not a period report.
--
-- onHandQty counts only batches that have not expired, which is what the Stock Management app
-- treats as available (StockManagementDao zeroes an expired batch in its inventory sums) and what
-- this report's consumer needs: it backs Days of Stock Remaining, and dividing a stock figure that
-- includes expired units by a consumption rate would forecast cover the location does not have.
-- expiredQty carries the rest, so the physical total is still recoverable as the sum of the two and
-- an item showing zero usable stock is visibly zero because its stock expired rather than
-- inexplicably empty.
--
-- A batch with no expiration date recorded counts as usable - the flow here records an expiry when
-- there is one to record, and treating "unknown" as expired would quietly write off good stock.
--
-- Only COMPLETED, non-voided operations count, matching stock_ledger_report.sql. Note two
-- deliberate divergences from that ledger: it reports physical stock on the shelf, expired or not,
-- because a movement ledger should not silently write off units that have not been disposed of yet;
-- and both differ from the Stock Management app for as long as a Transfer Out or Disposal sits
-- submitted but unapproved, which the app deducts immediately and these do not.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  SUM(CASE WHEN sb.expiration IS NULL OR sb.expiration > CURDATE()
           THEN sit.quantity * puom.factor ELSE 0 END) AS onHandQty,
  SUM(CASE WHEN sb.expiration IS NOT NULL AND sb.expiration <= CURDATE()
           THEN sit.quantity * puom.factor ELSE 0 END) AS expiredQty,
  un.name          AS unitName,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
-- INNER is safe: stockmgmt_stock_item_transaction.stock_batch_id is NOT NULL, so no transaction can
-- be dropped by requiring its batch.
JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- bulkUnitName/bulkFactor describe the item's bulk/procurement pack (e.g. a Box of 30 Tablet),
-- carried so a quantity can also be read as whole packs - "92 Box (2,760 Tablet)". Every quantity
-- these reports return is in dispensing units, so the pack figure is quantity / bulkFactor.
-- LEFT JOIN because an item need not have a bulk pack configured; and a pack holding a single
-- dispensing unit (factor 1, e.g. a Box of 1 Bottle) is left to the consumer to render as the
-- plain unit rather than as "5 Box (5 Bottle)".
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
WHERE si.voided = 0
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
GROUP BY si.stock_item_id, si.common_name, p.party_id, l.name, un.name, bun.name, bulk.factor
ORDER BY si.common_name, l.name
