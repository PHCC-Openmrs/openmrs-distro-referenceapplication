package org.openmrs.module.labtestreport.web.fhir;

import static org.openmrs.module.fhir2.FhirConstants.OPENMRS_FHIR_EXT_ENCOUNTER_TAG;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;

import ca.uhn.fhir.model.api.Include;
import ca.uhn.fhir.rest.annotation.OptionalParam;
import ca.uhn.fhir.rest.annotation.Search;
import ca.uhn.fhir.rest.api.SortOrderEnum;
import ca.uhn.fhir.rest.api.SortSpec;
import ca.uhn.fhir.rest.api.server.IBundleProvider;
import ca.uhn.fhir.rest.param.DateRangeParam;
import ca.uhn.fhir.rest.param.HasAndListParam;
import ca.uhn.fhir.rest.param.HasOrListParam;
import ca.uhn.fhir.rest.param.HasParam;
import ca.uhn.fhir.rest.param.ReferenceAndListParam;
import ca.uhn.fhir.rest.param.ReferenceOrListParam;
import ca.uhn.fhir.rest.param.ReferenceParam;
import ca.uhn.fhir.rest.param.TokenAndListParam;
import ca.uhn.fhir.rest.param.TokenParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import org.apache.commons.lang3.StringUtils;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.Encounter;
import org.openmrs.module.fhir2.api.FhirEncounterService;
import org.openmrs.module.fhir2.api.annotations.R4Provider;
import org.openmrs.module.fhir2.api.search.param.EncounterSearchParams;
import org.openmrs.module.labtestreport.PatientNameSearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Adds Encounter?_query=encountersWithMedicationRequestsByPatientName next to fhir2's
 * encountersWithMedicationRequests, for the dispensing app's Active / All prescriptions tables. It is
 * the same query (see fhir2's r4 EncounterFhirResourceProvider) except for patientSearchTerm: fhir2
 * matches every typed word against any of given, middle or family name, so a common name brings back
 * everyone who has it anywhere in their name. Here the first word has to start the first (given) name
 * and each further word the name word at the same position, as worked out by
 * {@link PatientNameSearchService}. A patient identifier still matches the whole term exactly.
 */
@Component("labtestreportDispensingEncounterFhirR4ResourceProvider")
@R4Provider
public class DispensingEncounterFhirResourceProvider implements IResourceProvider {

	@Autowired
	private FhirEncounterService encounterService;

	@Autowired
	private PatientNameSearchService patientNameSearchService;

	@Override
	public Class<? extends IBaseResource> getResourceType() {
		return Encounter.class;
	}

	@Search(queryName = "encountersWithMedicationRequestsByPatientName")
	public IBundleProvider getEncountersWithMedicationRequestsByPatientNameSearch(
	        @OptionalParam(name = Encounter.SP_DATE) DateRangeParam date, @OptionalParam(name = "status") TokenParam status,
	        @OptionalParam(name = Encounter.SP_TYPE) TokenAndListParam type,
	        @OptionalParam(name = "patientSearchTerm") TokenParam patientSearchTerm,
	        @OptionalParam(name = "location") ReferenceAndListParam location) {

		EncounterSearchParams params = new EncounterSearchParams();

		// we always want encounters, not visits
		params.setTag(new TokenAndListParam()
		        .addAnd(new TokenParam().setSystem(OPENMRS_FHIR_EXT_ENCOUNTER_TAG).setValue("encounter")));

		if (date != null && !date.isEmpty()) {
			params.setDate(date);
		}

		if (status != null && !status.isEmpty() && status.getValue().equalsIgnoreCase("active")) {
			// at least one medication request that is neither completed nor cancelled nor declined
			HasOrListParam notCompletedHasParam = new HasOrListParam()
			        .add(new HasParam("MedicationRequest", "encounter", "fulfillerStatus:not", "completed"));
			HasOrListParam notDeclinedHasParam = new HasOrListParam()
			        .add(new HasParam("MedicationRequest", "encounter", "fulfillerStatus:not", "declined"));
			HasOrListParam notCancelledHasParam = new HasOrListParam()
			        .add(new HasParam("MedicationRequest", "encounter", "status:not", "cancelled"));
			params.setHasAndListParam(
			    new HasAndListParam().addAnd(notCancelledHasParam).addAnd(notDeclinedHasParam).addAnd(notCompletedHasParam));
		} else {
			// at least one medication request
			params.setHasAndListParam(new HasAndListParam()
			        .addAnd(new HasOrListParam().add(new HasParam("MedicationRequest", "encounter", "intent", "order"))));
		}

		// most recent first
		SortSpec sortSpec = new SortSpec();
		sortSpec.setParamName("date");
		sortSpec.setOrder(SortOrderEnum.DESC);
		params.setSort(sortSpec);

		if (patientSearchTerm != null && StringUtils.isNotBlank(patientSearchTerm.getValue())) {
			params.setSubject(new ReferenceAndListParam().addAnd(toSubjectReference(patientSearchTerm.getValue().trim())));
		}

		// all this convoluted testing is just a null/empty check (so "location=empty_string" is ignored)
		if (location != null && !location.getValuesAsQueryTokens().isEmpty()
		        && !location.getValuesAsQueryTokens().get(0).getValuesAsQueryTokens().isEmpty()
		        && !location.getValuesAsQueryTokens().get(0).getValuesAsQueryTokens().get(0).getValue().isEmpty()) {
			params.setLocation(location);
		}

		// same null/empty check for "type"
		if (type != null && !type.getValuesAsQueryTokens().isEmpty()
		        && !type.getValuesAsQueryTokens().get(0).getValuesAsQueryTokens().isEmpty()
		        && !type.getValuesAsQueryTokens().get(0).getValuesAsQueryTokens().get(0).getValue().isEmpty()) {
			params.setEncounterType(type);
		}

		// include all medication requests of the encounter, and then all dispenses of those requests
		HashSet<Include> revIncludes = new HashSet<>();
		revIncludes.add(new Include("MedicationRequest:encounter", false));
		revIncludes.add(new Include("MedicationDispense:prescription", true));
		params.setRevIncludes(revIncludes);

		return encounterService.searchForEncounters(params);
	}

	private ReferenceOrListParam toSubjectReference(String term) {
		ReferenceOrListParam subjectReference = new ReferenceOrListParam();
		subjectReference.add(new ReferenceParam("identifier", term));

		List<String> words = Arrays.asList(StringUtils.split(term, " \t,"));
		if (words.size() == 1) {
			// a single word only has to start the given name, which fhir2 can match without listing
			// every patient it applies to (a common first name can cover a large share of patients)
			subjectReference.add(new ReferenceParam("given", words.get(0) + "%"));
		} else {
			for (String patientUuid : patientNameSearchService.getPatientUuidsByNameWords(words)) {
				subjectReference.add(new ReferenceParam(patientUuid));
			}
		}
		return subjectReference;
	}
}
