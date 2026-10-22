package org.openmrs.module.labtestreport.db;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing {@link org.openmrs.module.labtestreport.NationalIdService}.
 */
public interface NationalIdDAO {

	/**
	 * @return true if a non-voided patient, other than {@code excludePatientUuid} when given, holds
	 *         exactly this value as a non-voided National ID
	 */
	boolean isNationalIdInUse(String nationalId, String excludePatientUuid) throws DAOException;
}
