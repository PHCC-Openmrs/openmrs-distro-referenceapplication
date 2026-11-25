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
--
-- Purchase price, per dispensing unit (the unit quantity is in), comes from two places:
--   batchUnitPrice - the price typed on the Opening Stock / Receipt line that brought the batch in:
--                    the earliest COMPLETED such line with a price. That price is per the pack the
--                    line was entered in ("100 per Box of 30"), so it is divided by the pack factor.
--   itemUnitPrice  - the stock item's default purchase price, likewise divided by its pack factor.
-- The consumer shows the batch price and falls back to the item price, saying which it used. Both are
-- worked out per batch after grouping, not per transaction, so the origin lookup runs once a batch.
SELECT
  bal.*,
  bpi.purchase_price / bpu.factor AS batchUnitPrice,
  si.purchase_price / ipu.factor  AS itemUnitPrice
FROM (
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
) bal
JOIN stockmgmt_stock_item si ON si.stock_item_id = bal.stockItemId
LEFT JOIN stockmgmt_stock_operation_item bpi ON bpi.stock_operation_item_id = (
  SELECT soi2.stock_operation_item_id
  FROM stockmgmt_stock_operation_item soi2
  JOIN stockmgmt_stock_operation so2 ON so2.stock_operation_id = soi2.stock_operation_id
  JOIN stockmgmt_stock_operation_type sot2 ON sot2.stock_operation_type_id = so2.operation_type_id
  JOIN stockmgmt_stock_item_packaging_uom pu2 ON pu2.stock_item_packaging_uom_id = soi2.stock_item_packaging_uom_id
  WHERE soi2.stock_batch_id = bal.stockBatchId
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
-- stockBatchId breaks ties between two batches of an item that share a batch number (e.g. "N/A").
ORDER BY bal.itemName, bal.batchNo, bal.locationName, bal.stockBatchId
