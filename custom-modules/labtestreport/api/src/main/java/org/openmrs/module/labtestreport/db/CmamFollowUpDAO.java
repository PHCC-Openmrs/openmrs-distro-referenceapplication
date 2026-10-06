package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;
import org.openmrs.module.labtestreport.CmamAgeGroup;

/**
 * Database access object backing the CMAM Follow-up report: each patient's most recent CMAM
 * encounter (by form, within the selected date range) grouped by Current Diagnosis, Child Last
 * Status and Alert Status, split by age group (see {@link CmamAgeGroup}).
 */
public interface CmamFollowUpDAO {

	/**
	 * @param ageGroup which age group's report to run
	 * @param startDate only consider CMAM encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only consider CMAM encounters through the end of this date (inclusive), or null for no upper bound
	 * @return one row per (dimension, category), each a 4-element array matching the column order
	 *         of queries/cmam_summary_report.sql (or cmam_summary_report_above5.sql)
	 */
	List<Object[]> getSummaryRows(CmamAgeGroup ageGroup, Date startDate, Date endDate) throws DAOException;

	/**
	 * @param ageGroup which age group's report to run
	 * @param dimensionConceptUuid the question concept's UUID (Current Diagnosis / Child Last Status / Alert Status)
	 * @param categoryConceptId the specific answer concept within that dimension
	 * @param startDate only consider CMAM encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only consider CMAM encounters through the end of this date (inclusive), or null for no upper bound
	 * @return one row per patient whose most recent CMAM encounter has that answer for that
	 *         dimension, each a 12-element array matching the column order of
	 *         queries/cmam_patients_for_category.sql (or cmam_patients_for_category_above5.sql)
	 */
	List<Object[]> getPatientsForCategory(CmamAgeGroup ageGroup, String dimensionConceptUuid,
	        Integer categoryConceptId, Date startDate, Date endDate) throws DAOException;
}
