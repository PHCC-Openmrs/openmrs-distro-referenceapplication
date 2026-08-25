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
	 * @return one row per (non-voided) Referral Form encounter, each a 26-element array matching the column order of
	 *         queries/referral_form_report.sql
	 */
	List<Object[]> getReferralFormReport(Date startDate, Date endDate) throws DAOException;
}
