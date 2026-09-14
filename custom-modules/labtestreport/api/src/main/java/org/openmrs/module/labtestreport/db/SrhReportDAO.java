package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the SRH report.
 */
public interface SrhReportDAO {

	/**
	 * @param startDate only include encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include encounters through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include encounters at this location, or null for no location filter
	 * @param section only include encounters from this SRH section, or null for every section
	 * @return one row per (non-voided) SRH encounter, each a 36-element array matching the column order of
	 *         queries/srh_report.sql
	 */
	List<Object[]> getSrhReport(Date startDate, Date endDate, String locationUuid, String section) throws DAOException;
}
