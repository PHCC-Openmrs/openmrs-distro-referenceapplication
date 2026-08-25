package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the Referral Form report: a single Referral Form submission (encounter), with every
 * field that was filled in on that form.
 */
public class ReferralFormRow {

	private Integer patientId;

	private String patientUuid;

	private String givenName;

	private String familyName;

	private Integer encounterId;

	private Date encounterDatetime;

	private String location;

	private String fullName;

	private Double age;

	private String gender;

	private Date referralDate;

	private String referralTime;

	private String formPatientId;

	private String phoneNumber;

	private String referringFacility;

	private String referredTo;

	private String urgency;

	private String transportation;

	private String referralCause;

	private String clinicalHistory;

	private String managementReceived;

	private String referringDoctor;

	private String headOfClinic;

	private String feedback;

	private String followUp;

	private String treatingDoctor;

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

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public Double getAge() {
		return age;
	}

	public void setAge(Double age) {
		this.age = age;
	}

	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = gender;
	}

	public Date getReferralDate() {
		return referralDate;
	}

	public void setReferralDate(Date referralDate) {
		this.referralDate = referralDate;
	}

	public String getReferralTime() {
		return referralTime;
	}

	public void setReferralTime(String referralTime) {
		this.referralTime = referralTime;
	}

	public String getFormPatientId() {
		return formPatientId;
	}

	public void setFormPatientId(String formPatientId) {
		this.formPatientId = formPatientId;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getReferringFacility() {
		return referringFacility;
	}

	public void setReferringFacility(String referringFacility) {
		this.referringFacility = referringFacility;
	}

	public String getReferredTo() {
		return referredTo;
	}

	public void setReferredTo(String referredTo) {
		this.referredTo = referredTo;
	}

	public String getUrgency() {
		return urgency;
	}

	public void setUrgency(String urgency) {
		this.urgency = urgency;
	}

	public String getTransportation() {
		return transportation;
	}

	public void setTransportation(String transportation) {
		this.transportation = transportation;
	}

	public String getReferralCause() {
		return referralCause;
	}

	public void setReferralCause(String referralCause) {
		this.referralCause = referralCause;
	}

	public String getClinicalHistory() {
		return clinicalHistory;
	}

	public void setClinicalHistory(String clinicalHistory) {
		this.clinicalHistory = clinicalHistory;
	}

	public String getManagementReceived() {
		return managementReceived;
	}

	public void setManagementReceived(String managementReceived) {
		this.managementReceived = managementReceived;
	}

	public String getReferringDoctor() {
		return referringDoctor;
	}

	public void setReferringDoctor(String referringDoctor) {
		this.referringDoctor = referringDoctor;
	}

	public String getHeadOfClinic() {
		return headOfClinic;
	}

	public void setHeadOfClinic(String headOfClinic) {
		this.headOfClinic = headOfClinic;
	}

	public String getFeedback() {
		return feedback;
	}

	public void setFeedback(String feedback) {
		this.feedback = feedback;
	}

	public String getFollowUp() {
		return followUp;
	}

	public void setFollowUp(String followUp) {
		this.followUp = followUp;
	}

	public String getTreatingDoctor() {
		return treatingDoctor;
	}

	public void setTreatingDoctor(String treatingDoctor) {
		this.treatingDoctor = treatingDoctor;
	}
}
