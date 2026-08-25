package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface ReferralFormReportService extends OpenmrsService {

	/**
	 * @param startDate only include Referral Form submissions on/after this date (inclusive), or null for no lower
	 *            bound
	 * @param endDate only include Referral Form submissions through the end of this date (inclusive), or null for no
	 *            upper bound
	 * @return one row per (non-voided) Referral Form encounter, most recent first
	 */
	List<ReferralFormRow> getReferralFormReport(Date startDate, Date endDate);
}
