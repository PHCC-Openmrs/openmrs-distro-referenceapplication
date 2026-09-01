package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the NCD Patient Card report: a single NCD Patient Card submission (encounter), with
 * every field that was filled in on that form.
 */
public class NcdPatientCardRow {

	private Integer patientId;

	private String patientUuid;

	private String givenName;

	private String middleName;

	private String familyName;

	private Integer encounterId;

	private Date encounterDatetime;

	private String location;

	private String nationalId;

	private Date dob;

	private String gender;

	private String phoneNumber;

	private String address;

	private String condition;

	private Date conditionStart;

	private String status;

	private Date followDate;

	private String bp;

	private Double glucose;

	private String medication;

	private Date nextFollow;

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

	public String getNationalId() {
		return nationalId;
	}

	public void setNationalId(String nationalId) {
		this.nationalId = nationalId;
	}

	public Date getDob() {
		return dob;
	}

	public void setDob(Date dob) {
		this.dob = dob;
	}

	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = gender;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getCondition() {
		return condition;
	}

	public void setCondition(String condition) {
		this.condition = condition;
	}

	public Date getConditionStart() {
		return conditionStart;
	}

	public void setConditionStart(Date conditionStart) {
		this.conditionStart = conditionStart;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Date getFollowDate() {
		return followDate;
	}

	public void setFollowDate(Date followDate) {
		this.followDate = followDate;
	}

	public String getBp() {
		return bp;
	}

	public void setBp(String bp) {
		this.bp = bp;
	}

	public Double getGlucose() {
		return glucose;
	}

	public void setGlucose(Double glucose) {
		this.glucose = glucose;
	}

	public String getMedication() {
		return medication;
	}

	public void setMedication(String medication) {
		this.medication = medication;
	}

	public Date getNextFollow() {
		return nextFollow;
	}

	public void setNextFollow(Date nextFollow) {
		this.nextFollow = nextFollow;
	}
}
