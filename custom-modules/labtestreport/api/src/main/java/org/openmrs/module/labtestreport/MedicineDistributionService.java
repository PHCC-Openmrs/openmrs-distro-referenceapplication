package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface MedicineDistributionService extends OpenmrsService {

	/**
	 * @param startDate only include drug orders activated on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include drug orders activated through the end of this date (inclusive), or null for no
	 *            upper bound
	 * @param locationUuid only include orders placed at this location, or null for no location filter
	 * @return one row per (non-voided, non-discontinue) drug order, most recent first
	 */
	List<MedicineDistributionRow> getMedicineDistributionReport(Date startDate, Date endDate, String locationUuid);
}
