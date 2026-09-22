-- Every stock Adjustment line, one row per transaction, with the reason and remarks its operation
-- header carried. Adjustment serves two unrelated purposes here: on drug items it records a
-- correction (a miscount or data-entry error), while on non-drug items it is how routine
-- consumption gets recorded, commodities having no dispensing workflow to draw stock down. Both
-- land in the same operation type, so the reason concept and the item's drug/non-drug identity are
-- the only things that tell them apart - hence both are selected here and classified in
-- StockFlowServiceImpl against the labtestreport.adjustmentConsumptionReasonUuids global property.
--
-- Only COMPLETED, non-voided operations count, and rows are dated by the operation date rather
-- than by date_created - the same rule stock_ledger_report.sql applies, so the two cross-foot.
-- A cancelled operation would otherwise contribute both its original transaction and the
-- compensating one written on cancellation, and an operation voided after the fact could not be
-- excluded at all, stockmgmt_stock_item_transaction having no voided column of its own.
--
-- Unlike stock_wastage_by_location.sql this neither negates the quantity nor filters on its sign:
-- an adjustment is legitimately an increase or a decrease (AdjustmentOperationTypeProcessor allows
-- negative item quantities), and which one it was is the point of the row. There is likewise no
-- GROUP BY - remarks is free text on the operation header, so collapsing lines together would
-- leave a quantity no single remark explains.
SELECT
  so.operation_date       AS operationDate,
  so.operation_number     AS operationNumber,
  p.party_id              AS locationId,
  l.name                  AS locationName,
  si.stock_item_id        AS stockItemId,
  si.common_name          AS itemName,
  -- The canonical pharmacy/non-pharmacy split, matching the predicate StockManagementDao uses
  -- throughout ("si.drug.drugId is not null") rather than the denormalised is_drug column.
  si.drug_id IS NOT NULL  AS isDrug,
  sb.batch_no             AS batchNo,
  sb.expiration           AS expirationDate,
  sit.quantity * puom.factor AS quantity,
  un.name                 AS unitName,
  bun.name                AS bulkUnitName,
  bulk.factor             AS bulkFactor,
  rc.uuid                 AS reasonUuid,
  rn.name                 AS reasonName,
  so.remarks              AS remarks,
  -- responsible_person points at users, not persons, and may be unset in favour of the free-text
  -- responsible_person_other the form offers instead.
  COALESCE(CONCAT_WS(' ', pn.given_name, pn.family_name), u.username, so.responsible_person_other)
                          AS responsiblePerson
FROM stockmgmt_stock_item_transaction sit
JOIN stockmgmt_stock_item si ON si.stock_item_id = sit.stock_item_id
JOIN stockmgmt_stock_item_packaging_uom puom ON puom.stock_item_packaging_uom_id = sit.stock_item_packaging_uom_id
JOIN stockmgmt_stock_operation so ON so.stock_operation_id = sit.stock_operation_id
JOIN stockmgmt_stock_operation_type sot ON sot.stock_operation_type_id = so.operation_type_id
JOIN stockmgmt_party p ON p.party_id = sit.party_id
LEFT JOIN location l ON l.location_id = p.location_id
LEFT JOIN stockmgmt_stock_batch sb ON sb.stock_batch_id = sit.stock_batch_id
LEFT JOIN concept_name un ON un.concept_id = si.dispensing_unit_id AND un.locale = 'en' AND un.locale_preferred = 1
-- Bulk/procurement pack, for the "92 Box (2,760 Tablet)" rendering - see stock_current_onhand.sql.
LEFT JOIN stockmgmt_stock_item_packaging_uom bulk ON bulk.stock_item_packaging_uom_id = si.default_stock_operations_uom_id AND bulk.voided = 0
LEFT JOIN concept_name bun ON bun.concept_id = bulk.packaging_uom_id AND bun.locale = 'en' AND bun.locale_preferred = 1
-- The reason concept, by uuid for classification and by name for display - the same join
-- stock_wastage_drilldown.sql makes for disposal reasons.
LEFT JOIN concept rc ON rc.concept_id = so.reason_id
LEFT JOIN concept_name rn ON rn.concept_id = so.reason_id AND rn.locale = 'en' AND rn.locale_preferred = 1
LEFT JOIN users u ON u.user_id = so.responsible_person
LEFT JOIN person_name pn ON pn.person_id = u.person_id AND pn.voided = 0 AND pn.preferred = 1
WHERE si.voided = 0
  AND sot.operation_type = 'adjustment'
  AND so.status = 'COMPLETED'
  AND COALESCE(so.voided, 0) = 0
  AND (:locationUuid IS NULL OR l.uuid = :locationUuid)
  AND (:startDate IS NULL OR DATE(so.operation_date) >= :startDate)
  AND (:endDate IS NULL OR DATE(so.operation_date) < DATE_ADD(:endDate, INTERVAL 1 DAY))
ORDER BY so.operation_date DESC, so.operation_number, si.common_name
