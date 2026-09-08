-- Purchase Order No / Purchase Request No / Project Fund Code are properties of the batch itself:
-- they describe the procurement that brought the batch into stock, not the day-to-day issues and
-- transfers that later draw it down. They are therefore resolved once per batch from that batch's
-- originating receipt/initial operation (the same batch_reference lookup the drill-down queries
-- use) instead of being collected from every operation that touched the batch, which would
-- otherwise mix an issue's own reference number into the batch's codes.
WITH batch_reference AS (
  SELECT rt.stock_batch_id,
    rso.external_reference AS externalReference,
    ROW_NUMBER() OVER (PARTITION BY rt.stock_batch_id ORDER BY rt.date_created DESC) AS rn
  FROM stockmgmt_stock_item_transaction rt
  JOIN stockmgmt_stock_operation rso ON rso.stock_operation_id = rt.stock_operation_id
  JOIN stockmgmt_stock_operation_type rsot ON rsot.stock_operation_type_id = rso.operation_type_id
  WHERE rsot.operation_type IN ('receipt', 'initial') AND rt.quantity > 0
),
-- Every transaction the ledger counts, reduced to the four things the ledger cares about: which
-- item, which location holds it, which batch, and what day it moved.
--
-- Only COMPLETED operations count. The stock module debits the source of a Transfer Out as soon
-- as it is submitted and writes a compensating credit if it is later cancelled or rejected, so
-- counting every transaction would show stock leaving a location before the transfer was ever
-- approved. Note this is a deliberate divergence from the Stock Management app's own on-hand
-- figure, which does include those not-yet-approved deductions.
--
-- The day comes from the operation date, not from date_created: a backdated Opening Stock belongs
-- on the day it is dated, and a two-step transfer (whose source leg is written at submit and
-- destination leg at approval) must report both legs on the same day, since they share one
-- operation and therefore one operation date.
--
-- txDate is defined here, once, deliberately: the day bucket, the window's ORDER BY, the
-- :startDate/:endDate filter and the pre-range carry-in below must all use the identical
-- expression, or the carry-in and the in-range window stop being exact complements and a
-- backdated transaction is either counted twice or lost - a discrepancy that would be invisible
-- because the rest of the report still reads as self-consistent.
tx AS (
  SELECT
    sit.stock_item_id  AS stockItemId,
    sit.party_id       AS partyId,
    sit.stock_batch_id AS batchId,
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
-- Stock each item/location/batch was already holding before the reporting range opened. Without
-- this the running balance below would restart from zero inside the range, which is wrong for a
-- site that records its stock once via Opening Stock and then reports month by month.
carry_in AS (
  SELECT stockItemId, partyId, batchId, SUM(qty) AS carryInQty
  FROM tx
  WHERE :startDate IS NOT NULL AND txDate < :startDate
  GROUP BY stockItemId, partyId, batchId
),
daily AS (
  SELECT stockItemId, partyId, batchId, txDate,
    -- Bucketed by the sign of the transaction rather than by operation type. Stock arriving at a
    -- location is stock arriving, whether it came from an Opening Stock, a transfer in, or a
    -- receipt, and the report shows a single Opening Balance column that all of it folds into -
    -- so Opening - Outgoing = Balance holds on every row.
    SUM(CASE WHEN qty > 0 THEN qty ELSE 0 END)  AS inflow,
    SUM(CASE WHEN qty < 0 THEN -qty ELSE 0 END) AS outgoing
  FROM (
    SELECT stockItemId, partyId, batchId, txDate, qty
    FROM tx
    WHERE (:startDate IS NULL OR txDate >= :startDate)
      AND (:endDate IS NULL OR txDate < DATE_ADD(:endDate, INTERVAL 1 DAY))
    UNION ALL
    -- A zero-quantity anchor at the start of the range for anything holding carried-in stock, so
    -- an item/location/batch that sat untouched through the whole range still appears with its
    -- balance instead of vanishing from the report. It adds nothing to the sums, and folds into
    -- the real row when there already is activity on that day.
    SELECT stockItemId, partyId, batchId, DATE(:startDate) AS txDate, 0 AS qty
    FROM carry_in
  ) ranged
  GROUP BY stockItemId, partyId, batchId, txDate
)
SELECT
  d.stockItemId,
  si.common_name AS itemName,
  d.partyId      AS locationId,
  l.name         AS locationName,
  sb.batch_no    AS batchNo,
  sb.expiration  AS expirationDate,
  d.txDate       AS ledgerDate,
  d.inflow       AS inflowQty,
  d.outgoing     AS outgoingQty,
  -- Closing balance: what the location already held when the range opened, plus every in-range day
  -- up to and including this one. Seeding the window with the carry-in rather than adding it
  -- afterwards is what makes the first in-range day close at the right figure instead of at that
  -- day's net movement alone.
  COALESCE(c.carryInQty, 0)
    + SUM(d.inflow - d.outgoing) OVER (
        PARTITION BY d.stockItemId, d.partyId, d.batchId ORDER BY d.txDate
      ) AS remainingQty,
  COALESCE(c.carryInQty, 0) AS carryInQty,
  un.name AS unitName,
  br.externalReference AS externalReference
FROM daily d
JOIN stockmgmt_stock_item si ON si.stock_item_id = d.stockItemId
JOIN stockmgmt_party p ON p.party_id = d.partyId
LEFT JOIN location l ON l.location_id = p.location_id
JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = d.batchId
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
LEFT JOIN carry_in c ON c.stockItemId = d.stockItemId AND c.partyId = d.partyId AND c.batchId = d.batchId
LEFT JOIN batch_reference br ON br.stock_batch_id = d.batchId AND br.rn = 1
ORDER BY itemName, locationName, batchNo, ledgerDate
