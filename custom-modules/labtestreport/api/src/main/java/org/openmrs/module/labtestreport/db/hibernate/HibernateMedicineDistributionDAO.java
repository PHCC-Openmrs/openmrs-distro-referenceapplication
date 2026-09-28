package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.MedicineDistributionDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateMedicineDistributionDAO implements MedicineDistributionDAO {

	private static final String MEDICINE_DISTRIBUTION_SQL = SqlResources.load("medicine_distribution_report.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getMedicineDistributionReport(Date startDate, Date endDate, String locationUuid)
	        throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(MEDICINE_DISTRIBUTION_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}
}
