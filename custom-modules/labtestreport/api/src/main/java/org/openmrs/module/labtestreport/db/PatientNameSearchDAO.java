package org.openmrs.module.labtestreport.db;

import java.util.List;

import org.openmrs.api.db.DAOException;

/**
 * Database access object backing {@link org.openmrs.module.labtestreport.PatientNameSearchService}.
 */
public interface PatientNameSearchDAO {

	/**
	 * @param words non-blank, trimmed words, at least one
	 * @return uuids of non-voided patients with a non-voided name whose words start with these words
	 *         at the same positions
	 */
	List<String> getPatientUuidsByNameWords(List<String> words) throws DAOException;
}
