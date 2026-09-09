-- Counts, per stock item/location, how many days WITH RECORDED ACTIVITY within the range ended
-- at a zero-or-below running balance. This is an approximation of true stockout frequency: gaps
-- between transaction dates aren't back-filled, so it undercounts a stockout that persists across
-- several calendar days with no further activity recorded in between.
--
-- Only COMPLETED, non-voided operations count, and days are bucketed by the operation date rather
-- than by date_created - the same rule stock_ledger_report.sql applies, so a day this report calls
-- a stockout is a day the ledger also closes at or below zero.
WITH tx AS (
  SELECT
    sit.stock_item_id AS stockItemId,
    sit.party_id      AS partyId,
    DATE(so.operation_date) AS txDate,
    sit.quantity * puom.factor AS qty
  FROM stockmgmt_stock_item_transaction sit
  JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
  JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
  JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
  JOIN stockmgmt_party p ON p.party_id = sit.party_id
  LEFT JOIN location l ON l.location_id = p.location_id
  WHERE si.voided = 0
    AND so.status = 'COMPLETED'
    AND COALESCE(so.voided, 0) = 0
    AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
),
-- Stock each item/location was already holding before the range opened. Without this the running
-- balance below restarts from zero inside the range, so for a site that records its stock once via
-- Opening Stock and then reports month by month, every single outflow day in a later month counted
-- as a stockout. txDate here must be the identical expression used in tx and in daily_net, or the
-- carry-in and the in-range days stop being exact complements at the boundary.
carry_in AS (
  SELECT stockItemId, partyId, SUM(qty) AS carryInQty
  FROM tx
  WHERE :startDate IS NOT NULL AND txDate < :startDate
  GROUP BY stockItemId, partyId
),
daily_net AS (
  SELECT stockItemId, partyId, txDate, SUM(qty) AS dayNet
  FROM tx
  WHERE (:startDate IS NULL OR txDate >= :startDate)
    AND (:endDate IS NULL OR txDate < DATE_ADD(:endDate, INTERVAL 1 DAY))
  GROUP BY stockItemId, partyId, txDate
),
daily AS (
  -- Seeding the window with the carry-in rather than adding it afterwards is what makes the first
  -- in-range day close at the right figure instead of at that day's net movement alone.
  SELECT n.stockItemId, n.partyId, n.txDate,
    COALESCE(c.carryInQty, 0)
      + SUM(n.dayNet) OVER (PARTITION BY n.stockItemId, n.partyId ORDER BY n.txDate) AS dayEndBalance
  FROM daily_net n
  LEFT JOIN carry_in c ON c.stockItemId = n.stockItemId AND c.partyId = n.partyId
)
-- No carry-in anchor row here, unlike the ledger: this report measures stockouts among days that
-- had activity, so an item holding carried-in stock but untouched through the range correctly
-- contributes no active days at all rather than a run of non-stockout ones.
SELECT
  d.stockItemId,
  si.common_name AS itemName,
  d.partyId      AS locationId,
  l.name         AS locationName,
  SUM(CASE WHEN d.dayEndBalance <= 0 THEN 1 ELSE 0 END) AS stockoutDays,
  COUNT(*) AS activeDays
FROM daily d
JOIN stockmgmt_stock_item si ON si.stock_item_id = d.stockItemId
JOIN stockmgmt_party p ON p.party_id = d.partyId
LEFT JOIN location l ON l.location_id = p.location_id
GROUP BY d.stockItemId, si.common_name, d.partyId, l.name
ORDER BY stockoutDays DESC
