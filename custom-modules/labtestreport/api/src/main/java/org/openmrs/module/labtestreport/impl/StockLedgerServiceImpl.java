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
			row.setOpeningAdjustmentQty(toDouble(r[7]));
			row.setIncomingQty(toDouble(r[8]));
			row.setOutgoingQty(toDouble(r[9]));
			row.setRemainingQty(toDouble(r[10]));
			row.setActualQty(row.getRemainingQty() - row.getIncomingQty() + row.getOutgoingQty()
			        - row.getOpeningAdjustmentQty());
			row.setUnitName((String) r[11]);
			row.setExternalReferences((String) r[12]);
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
}
