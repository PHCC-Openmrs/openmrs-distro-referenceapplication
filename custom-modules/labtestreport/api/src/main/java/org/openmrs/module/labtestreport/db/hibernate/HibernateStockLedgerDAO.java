package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.hibernate.type.StandardBasicTypes;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.SqlResources;
import org.openmrs.module.labtestreport.db.StockLedgerDAO;

public class HibernateStockLedgerDAO implements StockLedgerDAO {

	private static final String LEDGER_REPORT_SQL = SqlResources.load("stock_ledger_report.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getLedgerRows(Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(LEDGER_REPORT_SQL);
		// Declared explicitly, unlike this module's other native-SQL DAOs, because this is the one
		// query whose column list was rewritten underneath its consumers: the SELECT changed from
		// (openingAdjustmentQty, incomingQty, outgoingQty, remainingQty) to
		// (inflowQty, outgoingQty, remainingQty, carryInQty) while StockLedgerServiceImpl went on
		// reading the old positions. Both layouts were 13 numeric-compatible columns, so every
		// figure silently shifted a slot instead of anything failing. addScalar makes Hibernate
		// resolve each column by name and fixes the tuple order here rather than in the SQL, so a
		// future rename or reorder of the SELECT list throws immediately.
		query.addScalar("stockItemId", StandardBasicTypes.INTEGER);
		query.addScalar("itemName", StandardBasicTypes.STRING);
		// party_id, not location_id - see StockLedgerRow#getLocationId.
		query.addScalar("locationId", StandardBasicTypes.INTEGER);
		query.addScalar("locationName", StandardBasicTypes.STRING);
		query.addScalar("batchNo", StandardBasicTypes.STRING);
		query.addScalar("expirationDate", StandardBasicTypes.DATE);
		query.addScalar("ledgerDate", StandardBasicTypes.DATE);
		query.addScalar("inflowQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("outgoingQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("remainingQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("carryInQty", StandardBasicTypes.BIG_DECIMAL);
		query.addScalar("unitName", StandardBasicTypes.STRING);
		query.addScalar("externalReference", StandardBasicTypes.STRING);
		// Appended rather than inserted alongside the other identifying columns above, so the
		// existing r[0]..r[12] positions StockLedgerServiceImpl reads stay untouched.
		query.addScalar("batchId", StandardBasicTypes.INTEGER);
		// Likewise appended, after batchId.
		query.addScalar("bulkUnitName", StandardBasicTypes.STRING);
		query.addScalar("bulkFactor", StandardBasicTypes.BIG_DECIMAL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}
}
