package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.DiseaseSummaryDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateDiseaseSummaryDAO implements DiseaseSummaryDAO {

	private static final String SUMMARY_REPORT_SQL = SqlResources.load("disease_summary_report.sql");

	private static final String EWARS_REPORT_SQL = SqlResources.load("ewars_report.sql");

	private static final String PATIENTS_FOR_EWARS_CELL_SQL = SqlResources.load("patients_for_ewars_cell.sql");

	private static final String PATIENTS_FOR_CELL_SQL = SqlResources.load("patients_for_diagnosis_cell.sql");

	private static final String RESOLVE_CONCEPT_NAMES_SQL = SqlResources.load("resolve_concept_names.sql");

	private static final String ACTIVITY_EVENTS_SQL = SqlResources.load("disease_activity_events.sql");

	// Same display columns as the other drill-downs, looked up by patient id.
	private static final String PATIENTS_SQL = SqlResources.load("rh_activity_report_patients.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getSummaryRows(Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(SUMMARY_REPORT_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getEwarsRows(Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(EWARS_REPORT_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getPatientsForDiagnosisCell(Integer diagnosisConceptId, String gender, String ageGroup,
	        Date startDate, Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(PATIENTS_FOR_CELL_SQL);
		query.setParameter("diagnosisConceptId", diagnosisConceptId);
		query.setParameter("gender", gender);
		query.setParameter("ageGroup", ageGroup);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getPatientsForEwarsCell(String diagnosisLabel, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(PATIENTS_FOR_EWARS_CELL_SQL);
		query.setParameter("diagnosisLabel", diagnosisLabel);
		query.setParameter("gender", gender);
		query.setParameter("ageGroup", ageGroup);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("locationUuid", locationUuid);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> resolveConceptNames(Collection<String> normalizedNames) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(RESOLVE_CONCEPT_NAMES_SQL);
		query.setParameterList("names", normalizedNames);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getActivityEvents(Collection<Integer> conceptIds, Date startDate, Date endDate,
	        String locationUuid) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(ACTIVITY_EVENTS_SQL);
		query.setParameterList("conceptIds", conceptIds);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
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
