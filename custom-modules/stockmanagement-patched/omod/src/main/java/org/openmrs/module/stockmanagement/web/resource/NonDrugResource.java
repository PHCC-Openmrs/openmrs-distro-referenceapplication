package org.openmrs.module.stockmanagement.web.resource;

import io.swagger.models.Model;
import io.swagger.models.ModelImpl;
import io.swagger.models.properties.StringProperty;
import org.apache.commons.lang.StringUtils;
import org.openmrs.Concept;
import org.openmrs.ConceptAnswer;
import org.openmrs.ConceptClass;
import org.openmrs.api.ConceptService;
import org.openmrs.api.context.Context;
import org.openmrs.module.stockmanagement.api.dto.NonDrugItem;
import org.openmrs.module.webservices.rest.web.RequestContext;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.openmrs.module.webservices.rest.web.annotation.Resource;
import org.openmrs.module.webservices.rest.web.representation.DefaultRepresentation;
import org.openmrs.module.webservices.rest.web.representation.FullRepresentation;
import org.openmrs.module.webservices.rest.web.representation.RefRepresentation;
import org.openmrs.module.webservices.rest.web.representation.Representation;
import org.openmrs.module.webservices.rest.web.resource.api.PageableResult;
import org.openmrs.module.webservices.rest.web.resource.impl.AlreadyPaged;
import org.openmrs.module.webservices.rest.web.resource.impl.DelegatingResourceDescription;
import org.openmrs.module.webservices.rest.web.response.ResourceDoesNotSupportOperationException;
import org.openmrs.module.webservices.rest.web.response.ResponseException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lists the items that can be picked as a "Non Pharmaceuticals" stock item, mirroring the shape of
 * the core /drug resource so the stock item "add item" form can pick a non-drug item the same way
 * it picks a drug. An item qualifies when either: (a) its concept belongs to one of the concept
 * classes named in the stockmanagement.nonDrugItemConceptClasses global property (default "Medical
 * supply"), or (b) it is explicitly curated as an answer of the "Non-drug" bucket concept under
 * "Stock item category" (8ccf6066-9297-4d76-aaf3-00aa3714d198), which is how the list used to be
 * built and stays supported for items that carry some other concept class.
 */
@Resource(name = RestConstants.VERSION_1 + "/non-drug", supportedClass = NonDrugItem.class, supportedOpenmrsVersions = {
        "1.9.*", "1.10.*", "1.11.*", "1.12.*", "2.*" })
public class NonDrugResource extends ResourceBase<NonDrugItem> {
	
	private static final String NON_DRUG_CATEGORY_UUID = "7b0f51f3-6fcb-4462-8746-3328e11a7d97";
	
	private static final String CONCEPT_CLASSES_PROPERTY = "stockmanagement.nonDrugItemConceptClasses";
	
	private static final String DEFAULT_CONCEPT_CLASSES = "Medical supply";
	
	@Override
	public NonDrugItem getByUniqueId(String uniqueId) {
		Concept concept = Context.getConceptService().getConceptByUuid(uniqueId);
		if (concept == null) {
			return null;
		}
		return new NonDrugItem(concept.getUuid(), concept.getDisplayString());
	}
	
	@Override
	protected void delete(NonDrugItem delegate, String reason, RequestContext context) throws ResponseException {
		throw new ResourceDoesNotSupportOperationException();
	}
	
	@Override
	protected PageableResult doSearch(RequestContext context) {
		return doGetAll(context);
	}
	
	@Override
	protected PageableResult doGetAll(RequestContext context) {
		String q = context.getParameter("q");
		Map<String, NonDrugItem> matches = new LinkedHashMap<String, NonDrugItem>();
		for (Concept concept : getCandidateConcepts()) {
			if (concept == null || Boolean.TRUE.equals(concept.getRetired())) {
				continue;
			}
			String display = concept.getDisplayString();
			if (StringUtils.isBlank(display)) {
				continue;
			}
			if (StringUtils.isBlank(q) || display.toLowerCase().contains(q.toLowerCase())) {
				matches.put(concept.getUuid(), new NonDrugItem(concept.getUuid(), display));
			}
		}
		
		List<NonDrugItem> items = new ArrayList<NonDrugItem>(matches.values());
		Collections.sort(items, new Comparator<NonDrugItem>() {
			
			@Override
			public int compare(NonDrugItem left, NonDrugItem right) {
				return String.CASE_INSENSITIVE_ORDER.compare(left.getDisplay(), right.getDisplay());
			}
		});
		
		int startIndex = context.getStartIndex();
		Integer limit = context.getLimit();
		List<NonDrugItem> page = items;
		boolean hasMore = false;
		if (startIndex > 0 || (limit != null && limit > 0)) {
			int end = (limit != null && limit > 0) ? Math.min(items.size(), startIndex + limit) : items.size();
			hasMore = end < items.size();
			page = startIndex < items.size() ? items.subList(startIndex, end) : new ArrayList<NonDrugItem>();
		}
		return new AlreadyPaged<NonDrugItem>(context, page, hasMore, (long) items.size());
	}
	
	/**
	 * Every concept eligible to become a non-pharmaceutical stock item, before the q filter is
	 * applied. May contain duplicates and retired concepts; callers de-duplicate by uuid.
	 */
	private List<Concept> getCandidateConcepts() {
		ConceptService conceptService = Context.getConceptService();
		List<Concept> concepts = new ArrayList<Concept>();
		for (String conceptClassName : getConceptClassNames()) {
			ConceptClass conceptClass = conceptService.getConceptClassByName(conceptClassName);
			if (conceptClass != null) {
				concepts.addAll(conceptService.getConceptsByClass(conceptClass));
			}
		}
		Concept nonDrugCategory = conceptService.getConceptByUuid(NON_DRUG_CATEGORY_UUID);
		if (nonDrugCategory != null) {
			for (ConceptAnswer answer : nonDrugCategory.getAnswers()) {
				concepts.add(answer.getAnswerConcept());
			}
		}
		return concepts;
	}
	
	private List<String> getConceptClassNames() {
		String configured = Context.getAdministrationService().getGlobalProperty(CONCEPT_CLASSES_PROPERTY,
		    DEFAULT_CONCEPT_CLASSES);
		if (StringUtils.isBlank(configured)) {
			configured = DEFAULT_CONCEPT_CLASSES;
		}
		List<String> conceptClassNames = new ArrayList<String>();
		for (String conceptClassName : configured.split(",")) {
			conceptClassName = conceptClassName.trim();
			if (!conceptClassName.isEmpty()) {
				conceptClassNames.add(conceptClassName);
			}
		}
		return conceptClassNames;
	}
	
	@Override
	public NonDrugItem newDelegate() {
		return new NonDrugItem();
	}
	
	@Override
	public NonDrugItem save(NonDrugItem delegate) {
		throw new ResourceDoesNotSupportOperationException();
	}
	
	@Override
	protected String getUniqueId(NonDrugItem delegate) {
		return delegate.getUuid();
	}
	
	@Override
	public void purge(NonDrugItem delegate, RequestContext context) throws ResponseException {
		throw new ResourceDoesNotSupportOperationException();
	}
	
	@Override
	public DelegatingResourceDescription getRepresentationDescription(Representation rep) {
		DelegatingResourceDescription description = new DelegatingResourceDescription();
		if (rep instanceof DefaultRepresentation || rep instanceof FullRepresentation || rep instanceof RefRepresentation) {
			description.addProperty("uuid");
			description.addProperty("display");
		}
		return description;
	}
	
	@Override
	public Model getGETModel(Representation rep) {
		ModelImpl modelImpl = (ModelImpl) super.getGETModel(rep);
		modelImpl.property("uuid", new StringProperty()).property("display", new StringProperty());
		return modelImpl;
	}
}
