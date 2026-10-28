package org.openmrs.module.stockmanagement.api;

import org.openmrs.MedicationDispense;
import org.openmrs.Order;
import org.openmrs.annotation.Authorized;
import org.openmrs.api.OpenmrsService;
import org.openmrs.module.stockmanagement.api.dto.MedicationDispenseRequest;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Saves dispenses together with the stock they take. Each call is one database transaction: the dispenses,
 * the prescriptions' fulfiller status and the stock movements are all saved, or, if anything fails (for
 * example a batch without enough stock), none of them are.
 * <p>
 * READ COMMITTED isolation, together with the order and batch row locks taken at the start, means that once
 * a call holds its locks every balance it reads includes whatever the previous holder committed.
 */
public interface MedicationDispenseStockService extends OpenmrsService {

	/**
	 * Saves new dispenses, or edits existing ones, with their stock. A new dispense whose uuid is already
	 * saved is returned as it is without taking stock again, so a request retried after a lost response is
	 * safe. Editing a dispense returns its previous stock and takes the new lines.
	 *
	 * @return the saved dispenses, in request order
	 */
	@Transactional(isolation = Isolation.READ_COMMITTED)
	@Authorized(Privileges.TASK_STOCKMANAGEMENT_STOCKITEMS_DISPENSE)
	List<MedicationDispense> saveMedicationDispenses(List<MedicationDispenseRequest> requests);

	/**
	 * Deletes (voids) a dispense, returns the stock it took and, when {@code fulfillerStatusSpecified} is
	 * set, updates its prescription's fulfiller status. Deleting a dispense that is already voided changes
	 * nothing.
	 */
	@Transactional(isolation = Isolation.READ_COMMITTED)
	@Authorized(Privileges.TASK_STOCKMANAGEMENT_STOCKITEMS_DISPENSE)
	MedicationDispense voidMedicationDispense(String uuid, boolean fulfillerStatusSpecified,
	        Order.FulfillerStatus fulfillerStatus, String reason);
}
