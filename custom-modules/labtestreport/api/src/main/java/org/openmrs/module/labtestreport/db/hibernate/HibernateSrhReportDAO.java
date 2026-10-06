package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.SqlResources;
import org.openmrs.module.labtestreport.db.SrhReportDAO;

public class HibernateSrhReportDAO implements SrhReportDAO {

	private static final String SRH_REPORT_SQL = SqlResources.load("srh_report.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getSrhReport(Date startDate, Date endDate, String locationUuid, String section)
	        throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(SRH_REPORT_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		query.setParameter("section", section);
		return query.list();
	}
}
