package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the Referral Form report.
 */
public interface ReferralFormReportDAO {

	/**
	 * @param startDate only include encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include encounters through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include encounters at this location, or null for no location filter
	 * @return one row per (non-voided) Referral Form encounter, each a 27-element array matching the column order of
	 *         queries/referral_form_report.sql
	 */
	List<Object[]> getReferralFormReport(Date startDate, Date endDate, String locationUuid) throws DAOException;
}
