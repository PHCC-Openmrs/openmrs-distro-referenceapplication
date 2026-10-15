package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface RhActivityReportService extends OpenmrsService {

	/**
	 * @param startDate only count activity on/after this date (inclusive), or null for no lower bound
	 * @param endDate only count activity through the end of this date (inclusive), or null for no upper bound
	 * @return the Reproductive Health Activity Report: one row per indicator, in paper-form order, with the
	 *         "Total number of patients seen across all RH services" row last
	 */
	List<RhActivityReportRow> getReport(Date startDate, Date endDate);

	/**
	 * Drills down into a single report cell to list the patients behind its count.
	 *
	 * @param indicatorKey the row's {@link RhActivityReportRow#getIndicatorKey()}
	 * @param gender "M" or "F", or null to match any gender (e.g. drilling down from the total column)
	 * @param ageGroup one of "0-4", "5-14", "15-18", "19-49", "50-65", "65+", or null to match any age
	 * @param startDate only include activity on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include activity through the end of this date (inclusive), or null for no upper bound
	 * @return each matching patient once, even if they count towards the cell more than once
	 */
	List<PatientRow> getPatientsForCell(String indicatorKey, String gender, String ageGroup, Date startDate,
	        Date endDate);
}
