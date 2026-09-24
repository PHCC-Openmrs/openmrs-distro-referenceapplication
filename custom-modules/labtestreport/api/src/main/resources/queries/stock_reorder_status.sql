-- Items whose usable stock has fallen below their configured reorder level (Stock Rule or the
-- item's own reorder level - see the threshold subquery below).
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
  th.ruleName      AS ruleName,
  th.reorderLevel  AS reorderLevel,
  COALESCE(onhand.onHandQty, 0) AS onHandQty,
  COALESCE(onhand.expiredQty, 0) AS expiredQty,
  un.name          AS unitName,
  bun.name         AS bulkUnitName,
  bulk.factor      AS bulkFactor
FROM (
  -- A reorder threshold can be configured in two places in the Stock Management app, and both
  -- count here:
  --  1. a Stock Rule, which is per location;
  --  2. the "Reorder level" field on the stock item itself, which is the one most users fill in
  --     and the one the app's Overview dashboard (understocked / nearing stock-out cards) reads.
  -- Reading only Stock Rules left this report empty whenever reorder levels were entered on the
  -- items, while the dashboard showed those same items as understocked.
  --
  -- A Stock Rule wins for its own item and location. The item-level figure has no location, so it
  -- applies at every location that holds stock (any location with a stock transaction), and at the
  -- location being filtered on so a store that has never been stocked still shows as out.
  SELECT sr.stock_item_id, sr.location_id, sr.name AS ruleName,
    sr.quantity * COALESCE(srPuom.factor, 1) AS reorderLevel
  FROM stockmgmt_stock_rule sr
  LEFT JOIN stockmgmt_stock_item_packaging_uom srPuom ON srPuom.stock_item_packaging_uom_id = sr.stock_item_packaging_uom_id
  WHERE sr.voided = 0
    AND sr.enabled = 1
    AND sr.quantity IS NOT NULL
  UNION ALL
  SELECT si2.stock_item_id, loc.location_id, NULL AS ruleName,
    si2.reorder_level * COALESCE(rlPuom.factor, 1) AS reorderLevel
  FROM stockmgmt_stock_item si2
  LEFT JOIN stockmgmt_stock_item_packaging_uom rlPuom ON rlPuom.stock_item_packaging_uom_id = si2.reorder_level_uom_id
  JOIN (
    SELECT DISTINCT sp.location_id
    FROM stockmgmt_party sp
    LEFT JOIN location sl ON sl.location_id = sp.location_id
    WHERE sp.location_id IS NOT NULL
      AND (sp.party_id IN (SELECT DISTINCT party_id FROM stockmgmt_stock_item_transaction)
           OR sl.uuid = :locationUuid)
  ) loc
  WHERE si2.reorder_level IS NOT NULL
    AND si2.reorder_level > 0
    AND NOT EXISTS (
      SELECT 1 FROM stockmgmt_stock_rule r
      WHERE r.stock_item_id = si2.stock_item_id
        AND r.location_id = loc.location_id
        AND r.voided = 0
        AND r.enabled = 1
        AND r.quantity IS NOT NULL
    )
) th
JOIN stockmgmt_stock_item si ON si.stock_item_id = th.stock_item_id
JOIN stockmgmt_party p ON p.location_id = th.location_id
LEFT JOIN location l ON l.location_id = th.location_id
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
WHERE si.voided = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND COALESCE(onhand.onHandQty, 0) < th.reorderLevel
ORDER BY (th.reorderLevel - COALESCE(onhand.onHandQty, 0)) DESC
