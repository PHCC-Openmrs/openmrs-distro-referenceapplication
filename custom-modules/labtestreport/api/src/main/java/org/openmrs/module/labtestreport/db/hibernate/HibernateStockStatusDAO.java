package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.hibernate.type.StandardBasicTypes;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.SqlResources;
import org.openmrs.module.labtestreport.db.StockStatusDAO;

public class HibernateStockStatusDAO implements StockStatusDAO {

	private static final String EXPIRY_RISK_SQL = SqlResources.load("stock_expiry_risk.sql");

	private static final String CURRENT_ONHAND_SQL = SqlResources.load("stock_current_onhand.sql");

	private static final String REORDER_STATUS_SQL = SqlResources.load("stock_reorder_status.sql");

	private static final String STOCKOUT_FREQUENCY_SQL = SqlResources.load("stock_stockout_frequency.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getExpiryRiskRows(Integer daysAhead, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(EXPIRY_RISK_SQL);
		query.setParameter("daysAhead", daysAhead);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getCurrentOnHandRows(String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(CURRENT_ONHAND_SQL);
		// Declared by name because expiredQty was inserted into the middle of this query's column
		// list, ahead of unitName. Read positionally, that is the change that silently shifts every
		// later value one slot along - the failure the stock ledger already shipped once.
		query.addScalar("stockItemId", StandardBasicTypes.INTEGER);
		query.addScalar("itemName", StandardBasicTypes.STRING);
		query.addScalar("locationId", StandardBasicTypes.INTEGER);
		query.addScalar("locationName", StandardBasicTypes.STRING);
		query.addScalar("onHandQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("expiredQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("unitName", StandardBasicTypes.STRING);
		query.addScalar("bulkUnitName", StandardBasicTypes.STRING);
		query.addScalar("bulkFactor", StandardBasicTypes.BIG_DECIMAL);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getReorderStatusRows(String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(REORDER_STATUS_SQL);
		// By name, for the same reason as getCurrentOnHandRows above: expiredQty was inserted before
		// unitName rather than appended.
		query.addScalar("stockItemId", StandardBasicTypes.INTEGER);
		query.addScalar("itemName", StandardBasicTypes.STRING);
		query.addScalar("locationId", StandardBasicTypes.INTEGER);
		query.addScalar("locationName", StandardBasicTypes.STRING);
		query.addScalar("ruleName", StandardBasicTypes.STRING);
		query.addScalar("reorderLevel", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("onHandQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("expiredQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("unitName", StandardBasicTypes.STRING);
		query.addScalar("bulkUnitName", StandardBasicTypes.STRING);
		query.addScalar("bulkFactor", StandardBasicTypes.BIG_DECIMAL);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getStockoutFrequencyRows(Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(STOCKOUT_FREQUENCY_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}
}
