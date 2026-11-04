package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface MonthlyHealthPromotionService extends OpenmrsService {

	/**
	 * @param startDate only count sessions on/after this date (inclusive), or null for no lower bound
	 * @param endDate only count sessions through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only count sessions at this location, or null for all locations
	 * @param subject only count sessions on this subject (case-insensitive), or null for all subjects
	 * @return the Monthly Health Promotion Report: for each of Individual Sessions, Group Sessions and
	 *         Follow up cases a session-type row followed by one row per session subject, then the Grand
	 *         Total row. Each cell counts distinct patients.
	 */
	List<MonthlyHealthPromotionRow> getReport(Date startDate, Date endDate, String locationUuid, String subject);

	/**
	 * @return the distinct session subjects recorded in the period/location, alphabetically, for the subject filter
	 */
	List<String> getSubjects(Date startDate, Date endDate, String locationUuid);

	/**
	 * Drills down into a single report cell to list the patients behind its count.
	 *
	 * @param sessionTypeKey the row's {@link MonthlyHealthPromotionRow#getSessionTypeKey()}, or "all" for the Grand Total
	 * @param subject the row's subject, or null for a session-type or Grand Total row
	 * @param gender "M" or "F", or null to match any gender
	 * @param ageGroup one of "0-4", "5-14", "15-18", "19-49", "50-65", "65+", or null to match any age
	 * @return each matching patient once
	 */
	List<PatientRow> getPatientsForCell(String sessionTypeKey, String subject, String gender, String ageGroup,
	        Date startDate, Date endDate, String locationUuid);
}
