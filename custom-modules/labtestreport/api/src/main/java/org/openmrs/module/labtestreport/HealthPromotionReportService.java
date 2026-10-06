package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface HealthPromotionReportService extends OpenmrsService {

	/**
	 * @param startDate only include Health Promotion Session submissions on/after this date (inclusive), or null for no
	 *            lower bound
	 * @param endDate only include Health Promotion Session submissions through the end of this date (inclusive), or
	 *            null for no upper bound
	 * @param locationUuid only include submissions at this location, or null for no location filter
	 * @return one row per (non-voided) Health Promotion Session encounter, most recent first
	 */
	List<HealthPromotionRow> getHealthPromotionReport(Date startDate, Date endDate, String locationUuid);
}
