package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the expiry-risk, days-of-stock-remaining, reorder-status and
 * stockout-frequency reports. Plain native SQL (see src/main/resources/queries).
 */
public interface StockStatusDAO {

	/**
	 * @return one row per batch per location, each a 9-element array matching the column order of
	 *         queries/stock_expiry_risk.sql
	 */
	List<Object[]> getExpiryRiskRows(Integer daysAhead, String locationUuid) throws DAOException;

	/**
	 * @return one row per stock item per location, each a 7-element array of {stockItemId, itemName,
	 *         locationId, locationName, onHandQty, expiredQty, unitName}. onHandQty counts only
	 *         batches that have not expired; expiredQty carries the remainder. That order is fixed
	 *         by the addScalar declarations in HibernateStockStatusDAO rather than by the SELECT
	 *         list of queries/stock_current_onhand.sql, so a renamed alias fails fast.
	 */
	List<Object[]> getCurrentOnHandRows(String locationUuid) throws DAOException;

	/**
	 * @return one row per (item, location) with an enabled reorder rule whose usable stock is below
	 *         it, each a 9-element array of {stockItemId, itemName, locationId, locationName,
	 *         ruleName, reorderLevel, onHandQty, expiredQty, unitName}. As above, onHandQty excludes
	 *         expired batches and the order is fixed by HibernateStockStatusDAO's addScalar calls.
	 */
	List<Object[]> getReorderStatusRows(String locationUuid) throws DAOException;

	/**
	 * @return one row per stock item per location, each a 6-element array matching the column
	 *         order of queries/stock_stockout_frequency.sql
	 */
	List<Object[]> getStockoutFrequencyRows(Date startDate, Date endDate, String locationUuid) throws DAOException;
}
