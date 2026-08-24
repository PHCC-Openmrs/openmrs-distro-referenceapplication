package org.openmrs.module.labtestreport.db.hibernate;

import java.util.Date;
import java.util.List;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.NutritionReportDAO;
import org.openmrs.module.labtestreport.db.SqlResources;

public class HibernateNutritionReportDAO implements NutritionReportDAO {

	private static final String NUTRITION_SUMMARY_SQL = SqlResources.load("nutrition_summary_report.sql");

	private static final String NUTRITION_FILTER_OPTIONS_SQL = SqlResources.load("nutrition_filter_options.sql");

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getSummaryRows(Date startDate, Date endDate, boolean underFive) throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(NUTRITION_SUMMARY_SQL);
		query.setParameter("startDate", startDate);
		query.setParameter("endDate", endDate);
		query.setParameter("underFive", underFive);
		return query.list();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getFilterOptionRows() throws DAOException {
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(NUTRITION_FILTER_OPTIONS_SQL);
		return query.list();
	}
}
