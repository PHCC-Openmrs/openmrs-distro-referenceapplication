package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the SRH report: a single Sexual Reproductive Health encounter from any of the three
 * SRH sections, with every observation recorded against it.
 *
 * <p>An encounter belongs to exactly one section, so only that section's fields are populated on
 * any given row -- {@link #getSection()} says which.
 */
public class SrhReportRow {

	private Integer patientId;

	private String patientUuid;

	private String givenName;

	private String middleName;

	private String familyName;

	private Integer encounterId;

	private Date encounterDatetime;

	private String location;

	private Integer age;

	private String gender;

	private String nationalId;

	private String phoneNumber;

	/**
	 * Which SRH section this encounter came from: "ultrasound", "stiGynaecology" or
	 * "familyPlanning". The columns belonging to the other two sections are null on this row.
	 */
	private String section;

	// Ultrasound section
	private String fetuses;

	private String fetalHeartPulsation;

	private String presentation;

	private String lieFetuses;

	private String fetalGender;

	private Double femurLength;

	private Double crownRumpLength;

	private Double biparietalDiameter;

	private Double abdominalCircumference;

	private Double gestationalAgeWeeks;

	private Double gestationalAgeDays;

	private String placenta;

	private String amnioticFluid;

	private Date expectedDateOfDelivery;

	private Double weeksSinceLmp;

	private String referrals;

	private String ultrasoundNotes;

	// STI and Gynaecology section
	private String pncTiming;

	private String sti;

	private String gynaecology;

	private String preConceptionCare;

	private String stiGynaecologyNotes;

	// Family Planning section
	private String familyPlanningVisitType;

	private String contraceptionKind;

	private String familyPlanningNotes;

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

	public Integer getEncounterId() {
		return encounterId;
	}

	public void setEncounterId(Integer encounterId) {
		this.encounterId = encounterId;
	}

	public Date getEncounterDatetime() {
		return encounterDatetime;
	}

	public void setEncounterDatetime(Date encounterDatetime) {
		this.encounterDatetime = encounterDatetime;
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

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getSection() {
		return section;
	}

	public void setSection(String section) {
		this.section = section;
	}

	public String getFetuses() {
		return fetuses;
	}

	public void setFetuses(String fetuses) {
		this.fetuses = fetuses;
	}

	public String getFetalHeartPulsation() {
		return fetalHeartPulsation;
	}

	public void setFetalHeartPulsation(String fetalHeartPulsation) {
		this.fetalHeartPulsation = fetalHeartPulsation;
	}

	public String getPresentation() {
		return presentation;
	}

	public void setPresentation(String presentation) {
		this.presentation = presentation;
	}

	public String getLieFetuses() {
		return lieFetuses;
	}

	public void setLieFetuses(String lieFetuses) {
		this.lieFetuses = lieFetuses;
	}

	public String getFetalGender() {
		return fetalGender;
	}

	public void setFetalGender(String fetalGender) {
		this.fetalGender = fetalGender;
	}

	public Double getFemurLength() {
		return femurLength;
	}

	public void setFemurLength(Double femurLength) {
		this.femurLength = femurLength;
	}

	public Double getCrownRumpLength() {
		return crownRumpLength;
	}

	public void setCrownRumpLength(Double crownRumpLength) {
		this.crownRumpLength = crownRumpLength;
	}

	public Double getBiparietalDiameter() {
		return biparietalDiameter;
	}

	public void setBiparietalDiameter(Double biparietalDiameter) {
		this.biparietalDiameter = biparietalDiameter;
	}

	public Double getAbdominalCircumference() {
		return abdominalCircumference;
	}

	public void setAbdominalCircumference(Double abdominalCircumference) {
		this.abdominalCircumference = abdominalCircumference;
	}

	public Double getGestationalAgeWeeks() {
		return gestationalAgeWeeks;
	}

	public void setGestationalAgeWeeks(Double gestationalAgeWeeks) {
		this.gestationalAgeWeeks = gestationalAgeWeeks;
	}

	public Double getGestationalAgeDays() {
		return gestationalAgeDays;
	}

	public void setGestationalAgeDays(Double gestationalAgeDays) {
		this.gestationalAgeDays = gestationalAgeDays;
	}

	public String getPlacenta() {
		return placenta;
	}

	public void setPlacenta(String placenta) {
		this.placenta = placenta;
	}

	public String getAmnioticFluid() {
		return amnioticFluid;
	}

	public void setAmnioticFluid(String amnioticFluid) {
		this.amnioticFluid = amnioticFluid;
	}

	public Date getExpectedDateOfDelivery() {
		return expectedDateOfDelivery;
	}

	public void setExpectedDateOfDelivery(Date expectedDateOfDelivery) {
		this.expectedDateOfDelivery = expectedDateOfDelivery;
	}

	public Double getWeeksSinceLmp() {
		return weeksSinceLmp;
	}

	public void setWeeksSinceLmp(Double weeksSinceLmp) {
		this.weeksSinceLmp = weeksSinceLmp;
	}

	public String getReferrals() {
		return referrals;
	}

	public void setReferrals(String referrals) {
		this.referrals = referrals;
	}

	public String getUltrasoundNotes() {
		return ultrasoundNotes;
	}

	public void setUltrasoundNotes(String ultrasoundNotes) {
		this.ultrasoundNotes = ultrasoundNotes;
	}

	public String getPncTiming() {
		return pncTiming;
	}

	public void setPncTiming(String pncTiming) {
		this.pncTiming = pncTiming;
	}

	public String getSti() {
		return sti;
	}

	public void setSti(String sti) {
		this.sti = sti;
	}

	public String getGynaecology() {
		return gynaecology;
	}

	public void setGynaecology(String gynaecology) {
		this.gynaecology = gynaecology;
	}

	public String getPreConceptionCare() {
		return preConceptionCare;
	}

	public void setPreConceptionCare(String preConceptionCare) {
		this.preConceptionCare = preConceptionCare;
	}

	public String getStiGynaecologyNotes() {
		return stiGynaecologyNotes;
	}

	public void setStiGynaecologyNotes(String stiGynaecologyNotes) {
		this.stiGynaecologyNotes = stiGynaecologyNotes;
	}

	public String getFamilyPlanningVisitType() {
		return familyPlanningVisitType;
	}

	public void setFamilyPlanningVisitType(String familyPlanningVisitType) {
		this.familyPlanningVisitType = familyPlanningVisitType;
	}

	public String getContraceptionKind() {
		return contraceptionKind;
	}

	public void setContraceptionKind(String contraceptionKind) {
		this.contraceptionKind = contraceptionKind;
	}

	public String getFamilyPlanningNotes() {
		return familyPlanningNotes;
	}

	public void setFamilyPlanningNotes(String familyPlanningNotes) {
		this.familyPlanningNotes = familyPlanningNotes;
	}
}
