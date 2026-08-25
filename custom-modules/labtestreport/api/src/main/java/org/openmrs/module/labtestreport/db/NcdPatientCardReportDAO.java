package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the NCD Patient Card report.
 */
public interface NcdPatientCardReportDAO {

	/**
	 * @param startDate only include encounters on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include encounters through the end of this date (inclusive), or null for no upper bound
	 * @return one row per (non-voided) NCD Patient Card encounter, each a 21-element array matching the column order
	 *         of queries/ncd_patient_card_report.sql
	 */
	List<Object[]> getNcdPatientCardReport(Date startDate, Date endDate) throws DAOException;
}
