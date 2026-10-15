package org.openmrs.module.labtestreport.db;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the Reproductive Health Activity Report.
 */
public interface RhActivityReportDAO {

	/**
	 * @param startDate only include activity on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include activity through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include SRH encounters and pediatric enrolments at this location, or null for all
	 *            locations
	 * @return one row per countable event, each a 4-element array matching the column order of
	 *         queries/rh_activity_report_events.sql: indicatorKey, patientId, ageGroup, gender
	 */
	List<Object[]> getEvents(Date startDate, Date endDate, String locationUuid) throws DAOException;

	/**
	 * @param patientIds the patients to look up; must not be empty
	 * @return one row per patient, each an 8-element array matching the column order of
	 *         queries/rh_activity_report_patients.sql
	 */
	List<Object[]> getPatients(Collection<Integer> patientIds) throws DAOException;
}
