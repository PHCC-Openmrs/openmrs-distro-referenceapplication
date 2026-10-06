package org.openmrs.module.labtestreport.db;

import java.util.List;

import org.openmrs.User;
import org.openmrs.api.db.DAOException;
import org.openmrs.notification.Alert;

/**
 * Database access object backing {@link org.openmrs.module.labtestreport.NotificationService}.
 * Queue and stock management rows are read with plain SQL so this module needs neither module on
 * its classpath.
 */
public interface NotificationDAO {

	/**
	 * @param marker text embedded in an alert's text
	 * @return every alert (read, unread or expired) whose text contains the marker, newest first
	 */
	List<Alert> getAlertsContaining(String marker) throws DAOException;

	/**
	 * Core's AlertService.getAlertsByUser can't be used: in 2.8 it checks "unread" on a second join
	 * of the recipients, so an alert comes back once per recipient who hasn't read it, and still
	 * shows for a user who has read it while anyone else hasn't.
	 *
	 * @return the unexpired alerts the user is a recipient of and has not read, each once
	 */
	List<Alert> getUnreadAlertsFor(User user) throws DAOException;

	/**
	 * @return {patient uuid, queue name, queue location id, provider waiting for's person id,
	 *         creator user id, name of the queue the patient came from}, or null if the entry does
	 *         not exist, is voided or has already ended
	 */
	Object[] getActiveQueueEntry(String queueEntryUuid) throws DAOException;

	/**
	 * @return {status, operation number, operation type name, at location id, operation type id,
	 *         submitted by user id, creator user id, changed by user id, approval required, submitted
	 *         date, reject reason, return reason}, or null if the operation does not exist or is
	 *         voided
	 */
	Object[] getStockOperation(String stockOperationUuid) throws DAOException;

	/**
	 * @return {user id, role name} for every enabled, currently active stock management role scope
	 *         that covers the location (directly, or through a parent scoped with descendants) and
	 *         the operation type (scopes that list no operation types cover all of them)
	 */
	List<Object[]> getStockRoleScopes(Integer locationId, Integer operationTypeId) throws DAOException;
}
