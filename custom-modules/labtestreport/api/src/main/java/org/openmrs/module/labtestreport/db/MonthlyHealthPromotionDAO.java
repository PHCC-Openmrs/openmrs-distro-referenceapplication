package org.openmrs.module.labtestreport.db;

import java.util.Collection;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the Monthly Health Promotion Report.
 */
public interface MonthlyHealthPromotionDAO {

	/**
	 * @param locationUuid only include sessions at this location, or null for all locations
	 * @return one row per Health Promotion Session submission (not date-filtered), each a 7-element array
	 *         matching the column order of queries/monthly_health_promotion_events.sql: patientId,
	 *         encounterId, sessionDate, sessionType, topic, age, gender
	 */
	List<Object[]> getEvents(String locationUuid) throws DAOException;

	/**
	 * @param patientIds the patients to look up; must not be empty
	 * @return one row per patient, each a 9-element array matching queries/rh_activity_report_patients.sql
	 */
	List<Object[]> getPatients(Collection<Integer> patientIds) throws DAOException;
}
