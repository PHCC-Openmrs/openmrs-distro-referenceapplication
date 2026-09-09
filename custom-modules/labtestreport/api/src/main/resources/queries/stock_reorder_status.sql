-- Items whose usable stock has fallen below their configured reorder level.
--
-- onHandQty deliberately excludes expired batches. What you reorder against is what you can
-- dispense, and an expired batch is not dispensable - the Stock Management app will not release it
-- for anything but a Disposal. Counting it would hold an item above its reorder level on the
-- strength of stock nobody can issue, which is precisely the case where a reorder is most needed.
-- expiredQty is carried alongside so a row flagged despite having physical stock explains itself
-- rather than looking like a bad reorder level.
SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  sr.name          AS ruleName,
  sr.quantity * COALESCE(srPuom.factor, 1) AS reorderLevel,
  COALESCE(onhand.onHandQty, 0) AS onHandQty,
  COALESCE(onhand.expiredQty, 0) AS expiredQty,
  un.name          AS unitName,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM stockmgmt_stock_rule sr
JOIN stockmgmt_stock_item si ON si.stock_item_id = sr.stock_item_id
LEFT JOIN stockmgmt_stock_item_packaging_uom srPuom ON srPuom.stock_item_packaging_uom_id = sr.stock_item_packaging_uom_id
JOIN stockmgmt_party p ON p.location_id = sr.location_id
LEFT JOIN location l ON l.location_id = sr.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
LEFT JOIN (
  -- Same usable/expired split and the same COMPLETED-and-not-voided rule as
  -- stock_current_onhand.sql, so the two reports agree on what a location holds. Without the status
  -- filter an item could be held above its reorder level by a transfer or disposal that was
  -- cancelled, and so never be flagged.
  SELECT sit.stock_item_id, sit.party_id,
    SUM(CASE WHEN sb.expiration IS NULL OR sb.expiration > CURDATE()
             THEN sit.quantity * puom.factor ELSE 0 END) AS onHandQty,
    SUM(CASE WHEN sb.expiration IS NOT NULL AND sb.expiration <= CURDATE()
             THEN sit.quantity * puom.factor ELSE 0 END) AS expiredQty
  FROM stockmgmt_stock_item_transaction sit
  JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
  JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
  JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
  WHERE so.status = 'COMPLETED'
    AND COALESCE(so.voided, 0) = 0
  GROUP BY sit.stock_item_id, sit.party_id
) onhand ON onhand.stock_item_id = si.stock_item_id AND onhand.party_id = p.party_id
WHERE sr.voided = 0
  AND sr.enabled = 1
  AND si.voided = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND COALESCE(onhand.onHandQty, 0) < sr.quantity * COALESCE(srPuom.factor, 1)
ORDER BY (sr.quantity * COALESCE(srPuom.factor, 1) - COALESCE(onhand.onHandQty, 0)) DESC
