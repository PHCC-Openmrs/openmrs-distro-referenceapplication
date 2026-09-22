package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.openmrs.api.context.Context;
import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.StockAdjustmentRow;
import org.openmrs.module.labtestreport.StockFlowService;
import org.openmrs.module.labtestreport.StockLocationQtyRow;
import org.openmrs.module.labtestreport.StockMovementDetailRow;
import org.openmrs.module.labtestreport.db.StockFlowDAO;

public class StockFlowServiceImpl extends BaseOpenmrsService implements StockFlowService {

	/**
	 * Comma-separated concept uuids of the adjustment reasons that mean routine consumption rather
	 * than an error correction. Which concepts those are is site data, not something this module can
	 * know, so the split has to be configured - see queries/stock_adjustments.sql for why the
	 * distinction matters.
	 */
	public static final String GP_CONSUMPTION_REASON_UUIDS = "labtestreport.adjustmentConsumptionReasonUuids";

	private StockFlowDAO dao;

	public void setDao(StockFlowDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<StockLocationQtyRow> getConsumptionByLocation(Date startDate, Date endDate, String locationUuid) {
		return toRows(dao.getConsumptionRows(startDate, endDate, locationUuid));
	}

	@Override
	public List<StockLocationQtyRow> getDistributionFromSource(Date startDate, Date endDate, String sourceLocationUuid) {
		return toRows(dao.getDistributionRows(startDate, endDate, sourceLocationUuid));
	}

	@Override
	public List<StockLocationQtyRow> getWastageByLocation(Date startDate, Date endDate, String locationUuid) {
		return toRows(dao.getWastageRows(startDate, endDate, locationUuid));
	}

	@Override
	public List<StockMovementDetailRow> getConsumptionDetails(Integer stockItemId, Integer locationId,
	        Date startDate, Date endDate) {
		return toDetailRows(dao.getConsumptionDetailRows(stockItemId, locationId, startDate, endDate));
	}

	@Override
	public List<StockMovementDetailRow> getWastageDetails(Integer stockItemId, Integer locationId, Date startDate,
	        Date endDate) {
		return toDetailRows(dao.getWastageDetailRows(stockItemId, locationId, startDate, endDate));
	}

	@Override
	public List<StockMovementDetailRow> getDistributionDetails(Integer stockItemId, Integer locationId,
	        String sourceLocationUuid, Date startDate, Date endDate) {
		return toDetailRows(dao.getDistributionDetailRows(stockItemId, locationId, sourceLocationUuid, startDate,
		    endDate));
	}

	@Override
	public List<StockAdjustmentRow> getAdjustments(Date startDate, Date endDate, String locationUuid) {
		Set<String> consumptionReasons = consumptionReasonUuids();
		List<StockAdjustmentRow> rows = new ArrayList<>();
		for (Object[] r : dao.getAdjustmentRows(startDate, endDate, locationUuid)) {
			StockAdjustmentRow row = new StockAdjustmentRow();
			row.setOperationDate((Date) r[0]);
			row.setOperationNumber((String) r[1]);
			row.setLocationId(toInteger(r[2]));
			row.setLocationName((String) r[3]);
			row.setStockItemId(toInteger(r[4]));
			row.setItemName((String) r[5]);
			row.setIsDrug(toBoolean(r[6]));
			row.setBatchNo((String) r[7]);
			row.setExpirationDate((Date) r[8]);
			row.setQuantity(toDouble(r[9]));
			row.setUnitName((String) r[10]);
			row.setBulkUnitName((String) r[11]);
			row.setBulkFactor(toNullableDouble(r[12]));
			row.setReasonUuid((String) r[13]);
			row.setReasonName((String) r[14]);
			row.setRemarks((String) r[15]);
			row.setResponsiblePerson((String) r[16]);

			boolean isConsumption = row.getReasonUuid() != null && consumptionReasons.contains(row.getReasonUuid());
			row.setPurpose(isConsumption ? StockAdjustmentRow.Purpose.CONSUMPTION
			        : StockAdjustmentRow.Purpose.CORRECTION);
			// A drug logged as consumption, or a commodity logged as a correction, is the wrong way
			// round for how each is meant to be recorded here - worth flagging rather than hiding,
			// since a mis-filed entry is exactly what skews both totals. Skipped entirely while no
			// consumption reasons are configured: everything would classify as a correction then, and
			// flagging every commodity row would be noise rather than a finding.
			boolean isDrug = Boolean.TRUE.equals(row.getIsDrug());
			row.setMismatched(!consumptionReasons.isEmpty() && (isDrug ? isConsumption : !isConsumption));
			rows.add(row);
		}
		return rows;
	}

	/**
	 * Read fresh on each call rather than cached, so an administrator editing the global property
	 * sees the report reclassify on the next refresh without a restart.
	 */
	private static Set<String> consumptionReasonUuids() {
		String configured = Context.getAdministrationService().getGlobalProperty(GP_CONSUMPTION_REASON_UUIDS);
		if (configured == null || configured.trim().isEmpty()) {
			return Collections.emptySet();
		}
		Set<String> uuids = new HashSet<>();
		for (String uuid : configured.split(",")) {
			String trimmed = uuid.trim();
			if (!trimmed.isEmpty()) {
				uuids.add(trimmed);
			}
		}
		return uuids;
	}

	private static List<StockMovementDetailRow> toDetailRows(List<Object[]> results) {
		List<StockMovementDetailRow> rows = new ArrayList<>();
		for (Object[] r : results) {
			StockMovementDetailRow row = new StockMovementDetailRow();
			row.setBatchNo((String) r[0]);
			row.setExpirationDate((java.util.Date) r[1]);
			row.setVendorName((String) r[2]);
			row.setQuantity(toDouble(r[3]));
			row.setUnitName((String) r[4]);
			row.setExternalReference((String) r[5]);
			row.setBulkUnitName((String) r[6]);
			row.setBulkFactor(toNullableDouble(r[7]));
			// Only the Wastage drilldown query (queries/stock_wastage_drilldown.sql) selects a 9th
			// column for the disposal reason - Consumption/Distribution rows stop at 8 columns. The
			// reason deliberately stays last there: the bulk columns were inserted ahead of it in
			// all three queries so this length test still identifies the same column.
			if (r.length > 8) {
				row.setReasonName((String) r[8]);
			}
			rows.add(row);
		}
		return rows;
	}

	private static List<StockLocationQtyRow> toRows(List<Object[]> results) {
		List<StockLocationQtyRow> rows = new ArrayList<>();
		for (Object[] r : results) {
			StockLocationQtyRow row = new StockLocationQtyRow();
			row.setStockItemId(toInteger(r[0]));
			row.setItemName((String) r[1]);
			row.setLocationId(toInteger(r[2]));
			row.setLocationName((String) r[3]);
			row.setQuantity(toDouble(r[4]));
			row.setUnitName((String) r[5]);
			row.setSourceLocationName((String) r[6]);
			row.setRemainingQty(toDouble(r[7]));
			row.setBulkUnitName((String) r[8]);
			row.setBulkFactor(toNullableDouble(r[9]));
			rows.add(row);
		}
		return rows;
	}

	private static Integer toInteger(Object value) {
		return value == null ? null : ((Number) value).intValue();
	}

	/** A SQL predicate such as "drug_id IS NOT NULL" arrives as a Boolean or as a 1/0 Number. */
	private static Boolean toBoolean(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Boolean) {
			return (Boolean) value;
		}
		return ((Number) value).intValue() != 0;
	}

	private static double toDouble(Object value) {
		return value == null ? 0d : ((Number) value).doubleValue();
	}

	/**
	 * Unlike {@link #toDouble(Object)}, keeps null as null: a missing bulk factor means the item has
	 * no bulk pack configured, which the consumer must be able to tell from a factor it can divide
	 * by. Collapsing it to 0 would invite a divide-by-zero downstream.
	 */
	private static Double toNullableDouble(Object value) {
		return value == null ? null : ((Number) value).doubleValue();
	}
}
