package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One unread notification for the logged-in user, as returned by the navbar bell's endpoint. A
 * flat DTO so the Alert/AlertRecipient cycle never reaches the JSON serializer.
 */
public class NotificationRow {

	private Integer id;

	/** one of {@link NotificationType}'s names */
	private String type;

	private String message;

	/** uuid of the order, encounter, patient, queue entry or stock operation the notification is about */
	private String referenceUuid;

	private String patientUuid;

	private Date dateCreated;

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public String getReferenceUuid() {
		return referenceUuid;
	}

	public void setReferenceUuid(String referenceUuid) {
		this.referenceUuid = referenceUuid;
	}

	public String getPatientUuid() {
		return patientUuid;
	}

	public void setPatientUuid(String patientUuid) {
		this.patientUuid = patientUuid;
	}

	public Date getDateCreated() {
		return dateCreated;
	}

	public void setDateCreated(Date dateCreated) {
		this.dateCreated = dateCreated;
	}
}
