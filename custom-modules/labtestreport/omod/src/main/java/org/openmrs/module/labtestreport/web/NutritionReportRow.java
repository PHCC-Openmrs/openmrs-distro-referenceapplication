package org.openmrs.module.labtestreport.web;

/**
 * JSP-friendly view of a {@link org.openmrs.module.labtestreport.NutritionSummaryRow}, shared by
 * the Child Under 5 and Child Above 5 admin report pages.
 */
public class NutritionReportRow {

	private final String patientUuid;

	private final String name;

	private final String category;

	private final Integer age;

	private final String location;

	private final String visitDate;

	private final long visitCount;

	private final Double currentMuac;

	private final Double lastMuac;

	private final String diagnosis;

	private final String typeOfSupplement;

	private final Double supplementQuantity;

	private final String nationalId;

	private final String phoneNumber;

	private final String project;

	public NutritionReportRow(String patientUuid, String name, String category, Integer age, String location,
	        String visitDate, long visitCount, Double currentMuac, Double lastMuac, String diagnosis,
	        String typeOfSupplement, Double supplementQuantity, String nationalId, String phoneNumber,
	        String project) {
		this.patientUuid = patientUuid;
		this.name = name;
		this.category = category;
		this.age = age;
		this.location = location;
		this.visitDate = visitDate;
		this.visitCount = visitCount;
		this.currentMuac = currentMuac;
		this.lastMuac = lastMuac;
		this.diagnosis = diagnosis;
		this.typeOfSupplement = typeOfSupplement;
		this.supplementQuantity = supplementQuantity;
		this.nationalId = nationalId;
		this.phoneNumber = phoneNumber;
		this.project = project;
	}

	public String getPatientUuid() {
		return patientUuid;
	}

	public String getName() {
		return name;
	}

	public String getCategory() {
		return category;
	}

	public Integer getAge() {
		return age;
	}

	public String getLocation() {
		return location;
	}

	public String getVisitDate() {
		return visitDate;
	}

	public long getVisitCount() {
		return visitCount;
	}

	public Double getCurrentMuac() {
		return currentMuac;
	}

	public Double getLastMuac() {
		return lastMuac;
	}

	public String getDiagnosis() {
		return diagnosis;
	}

	public String getTypeOfSupplement() {
		return typeOfSupplement;
	}

	public Double getSupplementQuantity() {
		return supplementQuantity;
	}

	public String getNationalId() {
		return nationalId;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public String getProject() {
		return project;
	}
}
