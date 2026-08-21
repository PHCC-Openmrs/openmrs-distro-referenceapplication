SELECT
  si.stock_item_id AS stockItemId,
  si.common_name   AS itemName,
  p.party_id       AS locationId,
  l.name           AS locationName,
  SUM(-sit.quantity * puom.factor) AS quantity,
  un.name          AS unitName,
  CAST(NULL AS CHAR(255)) AS sourceLocationName,
  (SELECT COALESCE(SUM(sit2.quantity * puom2.factor), 0)
   FROM stockmgmt_stock_item_transaction sit2
   JOIN stockmgmt_stock_item_packaging_uom puom2 ON puom2.stock_item_packaging_uom_id = sit2.stock_item_packaging_uom_id
   WHERE sit2.stock_item_id = si.stock_item_id AND sit2.party_id = p.party_id) AS remainingQty
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
WHERE si.voided = 0
  AND sot.operation_type = 'stockissue'
  AND sit.quantity < 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND (:startDate IS NULL OR DATE(sit.date_created) >= :startDate)
  AND (:endDate IS NULL OR DATE(sit.date_created) < DATE_ADD(:endDate, INTERVAL 1 DAY))
GROUP BY si.stock_item_id, si.common_name, p.party_id, l.name, un.name
ORDER BY quantity DESC
