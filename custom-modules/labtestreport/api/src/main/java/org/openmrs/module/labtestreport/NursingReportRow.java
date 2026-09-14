package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the Nursing report: a single Nursing encounter, with every nursing observation
 * recorded against it.
 */
public class NursingReportRow {

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

	private String typeOfWound;

	/** Every ointment applied at this encounter, comma-separated -- the form allows more than one. */
	private String ointments;

	private String dressingGeneralNotes;

	private Double spirometry;

	private Double monofilament;

	private String imInjection;

	private String ivInjection;

	private String oral;

	private String nebulization;

	/** UUID of the ECG attachment recorded at this encounter, or null if no ECG was uploaded. */
	private String ecgAttachmentUuid;

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

	public String getTypeOfWound() {
		return typeOfWound;
	}

	public void setTypeOfWound(String typeOfWound) {
		this.typeOfWound = typeOfWound;
	}

	public String getOintments() {
		return ointments;
	}

	public void setOintments(String ointments) {
		this.ointments = ointments;
	}

	public String getDressingGeneralNotes() {
		return dressingGeneralNotes;
	}

	public void setDressingGeneralNotes(String dressingGeneralNotes) {
		this.dressingGeneralNotes = dressingGeneralNotes;
	}

	public Double getSpirometry() {
		return spirometry;
	}

	public void setSpirometry(Double spirometry) {
		this.spirometry = spirometry;
	}

	public Double getMonofilament() {
		return monofilament;
	}

	public void setMonofilament(Double monofilament) {
		this.monofilament = monofilament;
	}

	public String getImInjection() {
		return imInjection;
	}

	public void setImInjection(String imInjection) {
		this.imInjection = imInjection;
	}

	public String getIvInjection() {
		return ivInjection;
	}

	public void setIvInjection(String ivInjection) {
		this.ivInjection = ivInjection;
	}

	public String getOral() {
		return oral;
	}

	public void setOral(String oral) {
		this.oral = oral;
	}

	public String getNebulization() {
		return nebulization;
	}

	public void setNebulization(String nebulization) {
		this.nebulization = nebulization;
	}

	public String getEcgAttachmentUuid() {
		return ecgAttachmentUuid;
	}

	public void setEcgAttachmentUuid(String ecgAttachmentUuid) {
		this.ecgAttachmentUuid = ecgAttachmentUuid;
	}
}
