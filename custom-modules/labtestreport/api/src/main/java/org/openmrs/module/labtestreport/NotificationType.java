package org.openmrs.module.labtestreport;

/**
 * What a bell notification is about. The frontend picks the icon and the page a click opens from
 * this.
 */
public enum NotificationType {
	LAB_RESULT,
	LAB_ORDER,
	MEDICATION_ORDER,
	PATIENT_REGISTERED,
	PATIENT_QUEUED,
	STOCK_OPERATION,
	/** stock management's own stock rule alerts */
	LOW_STOCK,
	/** stock management's own batch expiry alerts */
	STOCK_EXPIRY,
	/** any other core alert, e.g. module startup errors for admins */
	GENERAL
}
