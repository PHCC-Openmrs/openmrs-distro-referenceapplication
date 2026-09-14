package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface NursingReportService extends OpenmrsService {

	/**
	 * @param startDate only include nursing encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include nursing encounters through the end of this date (inclusive), or null for no upper
	 *            bound
	 * @param locationUuid only include encounters at this location, or null for no location filter
	 * @return one row per (non-voided) Nursing encounter, most recent first
	 */
	List<NursingReportRow> getNursingReport(Date startDate, Date endDate, String locationUuid);
}
