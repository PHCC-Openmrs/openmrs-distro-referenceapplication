package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the Nutrition Report: each beneficiary's most recent Nutrition
 * Registration CU5 / Nutrition WFP PBW encounter, bucketed into Child Under 5 / Child Above 5 by
 * their current age.
 */
public interface NutritionReportDAO {

	/**
	 * @param startDate only consider encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only consider encounters through the end of this date (inclusive), or null for no upper
	 *            bound
	 * @param underFive true for beneficiaries currently under 5, false for beneficiaries 5 and over
	 * @return one row per beneficiary, each a 17-element array matching the column order of
	 *         queries/nutrition_summary_report.sql
	 */
	List<Object[]> getSummaryRows(Date startDate, Date endDate, boolean underFive) throws DAOException;

	/**
	 * @return one row per filter option, each a 2-element array of (filterType, optionValue) matching
	 *         queries/nutrition_filter_options.sql
	 */
	List<Object[]> getFilterOptionRows() throws DAOException;
}
