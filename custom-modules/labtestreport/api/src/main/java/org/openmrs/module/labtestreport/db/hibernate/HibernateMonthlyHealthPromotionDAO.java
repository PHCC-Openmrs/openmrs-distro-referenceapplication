package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Collection;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.MonthlyHealthPromotionDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateMonthlyHealthPromotionDAO implements MonthlyHealthPromotionDAO {

	private static final String EVENTS_SQL = SqlResources.load("monthly_health_promotion_events.sql");

	// The drill-down lists the same patient columns as the RH Activity Report's, so it shares that query.
	private static final String PATIENTS_SQL = SqlResources.load("rh_activity_report_patients.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getEvents(String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(EVENTS_SQL);
		query.setParameter("locationUuid", locationUuid);
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
