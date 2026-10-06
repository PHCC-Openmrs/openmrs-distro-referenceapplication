package org.openmrs.module.labtestreport;

import java.util.List;

/**
 * The dropdown option lists for the Nutrition (Child Under 5 / Child Above 5) report filters,
 * pulled from the concept dictionary and from what has actually been recorded - not just from
 * whatever happens to be in the currently-loaded report rows.
 */
public class NutritionFilterOptions {

	private List<String> locations;

	private List<String> categories;

	private List<String> diagnoses;

	private List<String> supplementTypes;

	private List<String> statuses;

	public List<String> getLocations() {
		return locations;
	}

	public void setLocations(List<String> locations) {
		this.locations = locations;
	}

	public List<String> getCategories() {
		return categories;
	}

	public void setCategories(List<String> categories) {
		this.categories = categories;
	}

	public List<String> getDiagnoses() {
		return diagnoses;
	}

	public void setDiagnoses(List<String> diagnoses) {
		this.diagnoses = diagnoses;
	}

	public List<String> getSupplementTypes() {
		return supplementTypes;
	}

	public void setSupplementTypes(List<String> supplementTypes) {
		this.supplementTypes = supplementTypes;
	}

	public List<String> getStatuses() {
		return statuses;
	}

	public void setStatuses(List<String> statuses) {
		this.statuses = statuses;
	}
}
