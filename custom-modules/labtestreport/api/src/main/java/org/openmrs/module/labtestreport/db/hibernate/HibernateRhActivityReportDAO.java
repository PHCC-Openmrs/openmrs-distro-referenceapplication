package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.RhActivityReportDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateRhActivityReportDAO implements RhActivityReportDAO {

	private static final String EVENTS_SQL = SqlResources.load("rh_activity_report_events.sql");

	private static final String PATIENTS_SQL = SqlResources.load("rh_activity_report_patients.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getEvents(Date startDate, Date endDate) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(EVENTS_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getPatients(Collection<Integer> patientIds) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(PATIENTS_SQL);
		query.setParameterList("patientIds", patientIds);
		return query.list();
	}
}
