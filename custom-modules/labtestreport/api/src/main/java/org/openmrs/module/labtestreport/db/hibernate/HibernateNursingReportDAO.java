package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.NursingReportDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateNursingReportDAO implements NursingReportDAO {

	private static final String NURSING_REPORT_SQL = SqlResources.load("nursing_report.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getNursingReport(Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(NURSING_REPORT_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}
}
