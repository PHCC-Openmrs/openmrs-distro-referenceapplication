package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the Medicine Distribution report: a single drug order, i.e. which medicine was prescribed to
 * which patient with its dose, frequency, route and duration, plus how much pharmacy dispensed against it.
 */
public class MedicineDistributionRow {

	private Integer patientId;

	private String patientUuid;

	private String givenName;

	private String middleName;

	private String familyName;

	private Integer orderId;

	private Date dateActivated;

	private String location;

	private Integer age;

	private String gender;

	private String nationalId;

	private Integer drugId;

	private String drugName;

	private Double dose;

	private String doseUnits;

	private String frequency;

	private String route;

	private Integer duration;

	private String durationUnits;

	private Double quantityPrescribed;

	private String quantityUnits;

	private Boolean asNeeded;

	private String dosingInstructions;

	/** Sum of every Completed hand-over for this order, or null if nothing has been dispensed yet. */
	private Double quantityDispensed;

	/** Status of the most recent dispense (Completed, On hold, Refused...), or null if pharmacy has not acted yet. */
	private String dispenseStatus;

	private String prescriber;

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

	public String getMiddleName() {
		return middleName;
	}

	public void setMiddleName(String middleName) {
		this.middleName = middleName;
	}

	public String getFamilyName() {
		return familyName;
	}

	public void setFamilyName(String familyName) {
		this.familyName = familyName;
	}

	public Integer getOrderId() {
		return orderId;
	}

	public void setOrderId(Integer orderId) {
		this.orderId = orderId;
	}

	public Date getDateActivated() {
		return dateActivated;
	}

	public void setDateActivated(Date dateActivated) {
		this.dateActivated = dateActivated;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public Integer getAge() {
		return age;
	}

	public void setAge(Integer age) {
		this.age = age;
	}

	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = gender;
	}

	public String getNationalId() {
		return nationalId;
	}

	public void setNationalId(String nationalId) {
		this.nationalId = nationalId;
	}

	public Integer getDrugId() {
		return drugId;
	}

	public void setDrugId(Integer drugId) {
		this.drugId = drugId;
	}

	public String getDrugName() {
		return drugName;
	}

	public void setDrugName(String drugName) {
		this.drugName = drugName;
	}

	public Double getDose() {
		return dose;
	}

	public void setDose(Double dose) {
		this.dose = dose;
	}

	public String getDoseUnits() {
		return doseUnits;
	}

	public void setDoseUnits(String doseUnits) {
		this.doseUnits = doseUnits;
	}

	public String getFrequency() {
		return frequency;
	}

	public void setFrequency(String frequency) {
		this.frequency = frequency;
	}

	public String getRoute() {
		return route;
	}

	public void setRoute(String route) {
		this.route = route;
	}

	public Integer getDuration() {
		return duration;
	}

	public void setDuration(Integer duration) {
		this.duration = duration;
	}

	public String getDurationUnits() {
		return durationUnits;
	}

	public void setDurationUnits(String durationUnits) {
		this.durationUnits = durationUnits;
	}

	public Double getQuantityPrescribed() {
		return quantityPrescribed;
	}

	public void setQuantityPrescribed(Double quantityPrescribed) {
		this.quantityPrescribed = quantityPrescribed;
	}

	public String getQuantityUnits() {
		return quantityUnits;
	}

	public void setQuantityUnits(String quantityUnits) {
		this.quantityUnits = quantityUnits;
	}

	public Boolean getAsNeeded() {
		return asNeeded;
	}

	public void setAsNeeded(Boolean asNeeded) {
		this.asNeeded = asNeeded;
	}

	public String getDosingInstructions() {
		return dosingInstructions;
	}

	public void setDosingInstructions(String dosingInstructions) {
		this.dosingInstructions = dosingInstructions;
	}

	public Double getQuantityDispensed() {
		return quantityDispensed;
	}

	public void setQuantityDispensed(Double quantityDispensed) {
		this.quantityDispensed = quantityDispensed;
	}

	public String getDispenseStatus() {
		return dispenseStatus;
	}

	public void setDispenseStatus(String dispenseStatus) {
		this.dispenseStatus = dispenseStatus;
	}

	public String getPrescriber() {
		return prescriber;
	}

	public void setPrescriber(String prescriber) {
		this.prescriber = prescriber;
	}
}
