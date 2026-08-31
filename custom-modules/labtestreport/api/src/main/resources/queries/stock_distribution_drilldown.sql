-- Backs the Stock Distribution summary's drill-down: for the (stockItemId, destination
-- locationId) cell the user clicked, list every transfer-out transaction with the batch it moved
-- and, via batch_vendor, the vendor that originally supplied that batch (found from that batch's
-- most recent receipt/initial transaction - a batch itself carries no vendor field, only its
-- receiving transaction does).
WITH batch_vendor AS (
  -- Opening/initial-stock transactions legitimately have no source party (they establish a
  -- starting count, not a purchase), so ss.name is NULL for them - that's not a data problem,
  -- so it's labeled distinctly rather than surfacing as an unqualified, alarming "Unknown".
  SELECT rt.stock_batch_id,
    CASE
      WHEN ss.name IS NOT NULL THEN ss.name
      WHEN rsot.operation_type = 'initial' THEN 'Opening stock (no vendor)'
      ELSE NULL
    END AS vendorName,
    ROW_NUMBER() OVER (PARTITION BY rt.stock_batch_id ORDER BY rt.date_created DESC) AS rn
  FROM stockmgmt_stock_item_transaction rt
  JOIN stockmgmt_stock_operation rso ON rso.stock_operation_id = rt.stock_operation_id
  JOIN stockmgmt_stock_operation_type rsot ON rsot.stock_operation_type_id = rso.operation_type_id
  LEFT JOIN stockmgmt_party rsp ON rsp.party_id = rso.source_id
  LEFT JOIN stockmgmt_stock_source ss ON ss.stock_source_id = rsp.stock_source_id
  WHERE rsot.operation_type IN ('receipt', 'initial') AND rt.quantity > 0
)
SELECT
  sb.batch_no             AS batchNo,
  sb.expiration           AS expirationDate,
  bv.vendorName           AS vendorName,
  SUM(sit.quantity * puom.factor) AS quantity,
  un.name                 AS unitName
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party srcP ON srcP.party_id = so.source_id
LEFT JOIN location srcL ON srcL.location_id = srcP.location_id
LEFT JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
LEFT JOIN batch_vendor bv ON bv.stock_batch_id = sb.stock_batch_id AND bv.rn = 1
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
WHERE si.voided = 0
  AND sot.operation_type = 'transferout'
  AND sit.quantity > 0
  AND sit.party_id != so.source_id
  AND si.stock_item_id = :stockItemId
  AND sit.party_id = :locationId
  AND (:sourceLocationUuid IS NULL OR srcL.uuid = :sourceLocationUuid)
  AND (:startDate IS NULL OR DATE(sit.date_created) >= :startDate)
  AND (:endDate IS NULL OR DATE(sit.date_created) < DATE_ADD(:endDate, INTERVAL 1 DAY))
GROUP BY sb.batch_no, sb.expiration, bv.vendorName, un.name
ORDER BY quantity DESC
