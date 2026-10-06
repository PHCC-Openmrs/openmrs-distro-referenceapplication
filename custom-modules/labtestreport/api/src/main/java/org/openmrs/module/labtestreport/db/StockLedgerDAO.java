package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the stock inventory ledger report. Plain native SQL (see
 * src/main/resources/queries) since the report pivots over the stock management module's own
 * tables directly rather than something naturally expressed through this module's domain model.
 */
public interface StockLedgerDAO {

	/**
	 * @param startDate only include activity on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include activity through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include this location's activity, or null for all locations combined
	 * @return one row per stock item/location/batch/day it had activity, each a 13-element array of
	 *         {stockItemId, itemName, locationId, locationName, batchNo, expirationDate, ledgerDate,
	 *         inflowQty, outgoingQty, remainingQty, carryInQty, unitName, externalReference}. That
	 *         order is fixed by the addScalar declarations in HibernateStockLedgerDAO rather than by
	 *         the SELECT list of queries/stock_ledger_report.sql, so reordering the query is safe
	 *         but renaming one of its aliases will fail fast. When startDate is given, the result
	 *         also carries a zero-quantity anchor row dated startDate for every item/location/batch
	 *         holding carried-in stock, so a batch untouched throughout the range still appears.
	 */
	List<Object[]> getLedgerRows(Date startDate, Date endDate, String locationUuid) throws DAOException;
}
