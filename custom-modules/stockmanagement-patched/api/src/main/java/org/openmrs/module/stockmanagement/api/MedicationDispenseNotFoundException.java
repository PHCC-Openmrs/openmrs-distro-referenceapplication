package org.openmrs.module.stockmanagement.api;

/**
 * The dispense being edited or deleted does not exist, or has already been deleted.
 */
public class MedicationDispenseNotFoundException extends StockManagementException {

	public MedicationDispenseNotFoundException(String message) {
		super(message);
	}
}
