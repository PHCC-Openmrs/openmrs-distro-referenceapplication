package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface SrhReportService extends OpenmrsService {

	/**
	 * @param startDate only include SRH encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include SRH encounters through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include encounters at this location, or null for no location filter
	 * @param section only include encounters from this SRH section -- "ultrasound", "stiGynaecology" or
	 *            "familyPlanning" -- or null for every section
	 * @return one row per (non-voided) SRH encounter, most recent first
	 */
	List<SrhReportRow> getSrhReport(Date startDate, Date endDate, String locationUuid, String section);
}
