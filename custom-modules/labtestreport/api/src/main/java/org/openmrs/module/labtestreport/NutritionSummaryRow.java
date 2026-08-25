package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the Nutrition Report (Child Under 5 / Child Above 5): a beneficiary's most recent
 * Nutrition Assessment encounter, including that visit's MUAC (Current MUAC) next to the MUAC
 * recorded at their previous visit (Last MUAC).
 */
public class NutritionSummaryRow {

	private Integer patientId;

	private String patientUuid;

	private String givenName;

	private String familyName;

	private String category;

	private Integer age;

	private String location;

	private Date visitDate;

	private long visitCount;

	private Double currentMuac;

	private Double lastMuac;

	private String diagnosis;

	private String typeOfSupplement;

	private Double supplementQuantity;

	private String nationalId;

	private String phoneNumber;

	private String project;

	private String status;

	public Integer getPatientId() {
		return patientId;
	}

	public void setPatientId(Integer patientId) {
		this.patientId = patientId;
	}

	public String getPatientUuid() {
		return patientUuid;
	}

	public void setPatientUuid(String patientUuid) {
		this.patientUuid = patientUuid;
	}

	public String getGivenName() {
		return givenName;
	}

	public void setGivenName(String givenName) {
		this.givenName = givenName;
	}

	public String getFamilyName() {
		return familyName;
	}

	public void setFamilyName(String familyName) {
		this.familyName = familyName;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public Integer getAge() {
		return age;
	}

	public void setAge(Integer age) {
		this.age = age;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public Date getVisitDate() {
		return visitDate;
	}

	public void setVisitDate(Date visitDate) {
		this.visitDate = visitDate;
	}

	public long getVisitCount() {
		return visitCount;
	}

	public void setVisitCount(long visitCount) {
		this.visitCount = visitCount;
	}

	public Double getCurrentMuac() {
		return currentMuac;
	}

	public void setCurrentMuac(Double currentMuac) {
		this.currentMuac = currentMuac;
	}

	public Double getLastMuac() {
		return lastMuac;
	}

	public void setLastMuac(Double lastMuac) {
		this.lastMuac = lastMuac;
	}

	public String getDiagnosis() {
		return diagnosis;
	}

	public void setDiagnosis(String diagnosis) {
		this.diagnosis = diagnosis;
	}

	public String getTypeOfSupplement() {
		return typeOfSupplement;
	}

	public void setTypeOfSupplement(String typeOfSupplement) {
		this.typeOfSupplement = typeOfSupplement;
	}

	public Double getSupplementQuantity() {
		return supplementQuantity;
	}

	public void setSupplementQuantity(Double supplementQuantity) {
		this.supplementQuantity = supplementQuantity;
	}

	public String getNationalId() {
		return nationalId;
	}

	public void setNationalId(String nationalId) {
		this.nationalId = nationalId;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getProject() {
		return project;
	}

	public void setProject(String project) {
		this.project = project;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}
}
