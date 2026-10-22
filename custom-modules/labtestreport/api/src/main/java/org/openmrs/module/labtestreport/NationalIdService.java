package org.openmrs.module.labtestreport;

import org.openmrs.api.OpenmrsService;

/**
 * Answers whether a National ID is already held by a patient, for the registration form's duplicate
 * check. A single exact lookup on the labtestreport_national_id_idx index (see liquibase.xml), so it
 * stays fast however many patients are registered.
 */
public interface NationalIdService extends OpenmrsService {

	/**
	 * @param nationalId the National ID to look up; surrounding whitespace is ignored
	 * @param excludePatientUuid a patient whose own National ID should not count (the patient being
	 *            edited), or null
	 * @return true if a non-voided patient other than the excluded one holds this National ID as a
	 *         non-voided identifier; false for a blank value
	 */
	boolean isNationalIdInUse(String nationalId, String excludePatientUuid);
}
