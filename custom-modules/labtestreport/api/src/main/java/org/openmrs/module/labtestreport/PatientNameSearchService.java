package org.openmrs.module.labtestreport;

import java.util.List;

import org.openmrs.api.OpenmrsService;

/**
 * Finds patients by the words of their name in order, for the dispensing prescriptions search. Unlike
 * the stock FHIR name search, which matches every typed word against any of given, middle or family
 * name, each typed word here has to start the name word at the same position, so "kumar sharma" finds
 * patients whose first name starts with "kumar" and whose next name word starts with "sharma", and
 * never a patient whose second or third name is "kumar".
 */
public interface PatientNameSearchService extends OpenmrsService {

	/**
	 * @param words the typed words, in order; blank words are ignored
	 * @return uuids of non-voided patients with a non-voided name whose words (given, then middle, then
	 *         family name) start with the typed words at the same positions; empty for no words
	 */
	List<String> getPatientUuidsByNameWords(List<String> words);
}
