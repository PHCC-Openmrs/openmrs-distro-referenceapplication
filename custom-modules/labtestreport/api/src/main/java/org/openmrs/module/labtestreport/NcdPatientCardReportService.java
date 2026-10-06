package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface NcdPatientCardReportService extends OpenmrsService {

	/**
	 * @param startDate only include NCD Patient Card submissions on/after this date (inclusive), or null for no lower
	 *            bound
	 * @param endDate only include NCD Patient Card submissions through the end of this date (inclusive), or null for
	 *            no upper bound
	 * @param locationUuid only include submissions recorded at this location, or null for all locations
	 * @return one row per (non-voided) NCD Patient Card encounter, most recent first
	 */
	List<NcdPatientCardRow> getNcdPatientCardReport(Date startDate, Date endDate, String locationUuid);
}
