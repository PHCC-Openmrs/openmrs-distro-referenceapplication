package org.openmrs.module.labtestreport;

import java.util.List;

import org.openmrs.api.OpenmrsService;

/**
 * Creates the core {@link org.openmrs.notification.Alert}s behind the navbar's notification bell,
 * and serves every unread alert of the logged-in user to it (including ones other modules create,
 * such as stock management's low stock and batch expiry alerts).
 * <p>
 * The {@code notify*} methods are called from event listeners, once per save of the entity, so
 * each one dedupes: calling it again for the same thing does not alert anyone twice. Role-based
 * recipients are limited to users whose location based access {@code locationUuid} user property
 * covers the location concerned (users without that property see every location), and the user
 * who performed the action is never notified about it.
 */
public interface NotificationService extends OpenmrsService {

	/**
	 * Tells the ordering provider's user(s), plus users holding a role listed in
	 * {@code labtestreport.notifications.labResultRoleNames}, that a test order's result is ready.
	 * Does nothing unless the order is a non-voided test order with fulfiller status COMPLETED.
	 */
	void notifyLabResultEntered(String orderUuid);

	/**
	 * Tells users holding a role in {@code labtestreport.notifications.labOrderRoleNames} (test
	 * orders) or {@code labtestreport.notifications.medicationOrderRoleNames} (drug orders) that new
	 * orders were placed. Orders placed in one encounter share a single notification that lists
	 * them all. Revisions and discontinuations are ignored.
	 */
	void notifyOrderPlaced(String orderUuid);

	/**
	 * Tells users holding a role in {@code labtestreport.notifications.patientRegisteredRoleNames}
	 * that a patient was registered.
	 */
	void notifyPatientRegistered(String patientUuid);

	/**
	 * Tells the provider a new queue entry is waiting for, or when it names none, the users whose
	 * role {@code labtestreport.notifications.queueRoleNames} maps to that queue, that the patient
	 * was added to the queue.
	 */
	void notifyPatientQueued(String queueEntryUuid);

	/**
	 * Tells approvers (users whose stock management role scope grants the approve privilege at the
	 * operation's location) when a stock operation is submitted, and the submitter when it is then
	 * approved, dispatched, returned or rejected. Once an operation leaves SUBMITTED, the pending
	 * approval notification is withdrawn from every approver.
	 */
	void notifyStockOperationChanged(String stockOperationUuid);

	/**
	 * @return the authenticated user's unread, unexpired notifications of the session location (those
	 *         that happened there or at a location inside it, plus any that carry no location), newest
	 *         first
	 */
	List<NotificationRow> getUnreadNotificationsForCurrentUser();

	/**
	 * Marks the given notification read for the authenticated user. Ignored if it does not exist or
	 * the user is not one of its recipients.
	 */
	void markRead(Integer alertId);

	/**
	 * Marks read every notification {@link #getUnreadNotificationsForCurrentUser()} returns.
	 */
	void markAllRead();
}
