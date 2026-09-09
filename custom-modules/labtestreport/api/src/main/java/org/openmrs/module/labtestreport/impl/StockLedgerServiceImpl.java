package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.StockLedgerRow;
import org.openmrs.module.labtestreport.StockLedgerService;
import org.openmrs.module.labtestreport.db.StockLedgerDAO;

public class StockLedgerServiceImpl extends BaseOpenmrsService implements StockLedgerService {

	private StockLedgerDAO dao;

	public void setDao(StockLedgerDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<StockLedgerRow> getLedgerReport(Date startDate, Date endDate, String locationUuid) {
		List<StockLedgerRow> rows = new ArrayList<>();
		for (Object[] r : dao.getLedgerRows(startDate, endDate, locationUuid)) {
			StockLedgerRow row = new StockLedgerRow();
			row.setStockItemId(toInteger(r[0]));
			row.setItemName((String) r[1]);
			row.setLocationId(toInteger(r[2]));
			row.setLocationName((String) r[3]);
			row.setBatchNo((String) r[4]);
			row.setExpirationDate((Date) r[5]);
			row.setLedgerDate((Date) r[6]);
			row.setInflowQty(toDouble(r[7]));
			row.setOutgoingQty(toDouble(r[8]));
			row.setRemainingQty(toDouble(r[9]));
			row.setCarryInQty(toDouble(r[10]));
			// The day's Opening Balance. "Opening - Outgoing = Balance" is the identity the report
			// is built around, which fixes this as remainingQty + outgoingQty; because the query
			// computes remaining as (previous balance + inflow - outgoing), that is the same thing
			// as (previous balance + the day's arrivals) - so arrivals fold into Opening Balance,
			// whether they came from an Opening Stock, a transfer in or a receipt.
			//
			// Deliberately NOT remainingQty - inflowQty + outgoingQty: that cancels down to the
			// previous balance alone, i.e. the pre-arrival figure, which drops the day's arrivals
			// and breaks the identity on any day stock came in - the day a transfer reaches its
			// destination, for one. The two agree whenever inflow is 0, which is exactly what
			// makes the wrong form look correct in an outflow-only test.
			//
			// Computed from this row alone rather than by carrying a running total, so the three
			// rendered numbers cannot be pulled out of step by filtering or ordering downstream.
			row.setActualQty(row.getRemainingQty() + row.getOutgoingQty());
			row.setUnitName((String) r[11]);
			row.setExternalReference((String) r[12]);
			row.setBatchId(toInteger(r[13]));
			row.setBulkUnitName((String) r[14]);
			row.setBulkFactor(toNullableDouble(r[15]));
			rows.add(row);
		}
		return rows;
	}

	private static Integer toInteger(Object value) {
		return value == null ? null : ((Number) value).intValue();
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
