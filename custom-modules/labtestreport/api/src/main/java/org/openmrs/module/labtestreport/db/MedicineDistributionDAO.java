package org.openmrs.module.labtestreport.db;

import java.util.Date;
import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing the Medicine Distribution report.
 */
public interface MedicineDistributionDAO {

	/**
	 * @param startDate only include orders activated on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include orders activated through the end of this date (inclusive), or null for no upper
	 *            bound
	 * @param locationUuid only include orders placed at this location, or null for no location filter
	 * @return one row per (non-voided, non-discontinue) drug order, each a 26-element array matching the column
	 *         order of queries/medicine_distribution_report.sql
	 */
	List<Object[]> getMedicineDistributionReport(Date startDate, Date endDate, String locationUuid)
	        throws DAOException;
}
