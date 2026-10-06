package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.openmrs.DrugOrder;
import org.openmrs.Encounter;
import org.openmrs.Location;
import org.openmrs.Order;
import org.openmrs.Patient;
import org.openmrs.PatientIdentifier;
import org.openmrs.Person;
import org.openmrs.PersonAttribute;
import org.openmrs.PersonAttributeType;
import org.openmrs.Role;
import org.openmrs.TestOrder;
import org.openmrs.User;
import org.openmrs.api.UserService;
import org.openmrs.api.context.Context;
import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.NotificationRow;
import org.openmrs.module.labtestreport.NotificationService;
import org.openmrs.module.labtestreport.NotificationType;
import org.openmrs.module.labtestreport.db.NotificationDAO;
import org.openmrs.notification.Alert;
import org.openmrs.util.PrivilegeConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

public class NotificationServiceImpl extends BaseOpenmrsService implements NotificationService {

	private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

	public static final String GP_LAB_RESULT_ROLES = "labtestreport.notifications.labResultRoleNames";

	public static final String GP_LAB_ORDER_ROLES = "labtestreport.notifications.labOrderRoleNames";

	public static final String GP_MEDICATION_ORDER_ROLES = "labtestreport.notifications.medicationOrderRoleNames";

	public static final String GP_PATIENT_REGISTERED_ROLES = "labtestreport.notifications.patientRegisteredRoleNames";

	public static final String GP_QUEUE_ROLES = "labtestreport.notifications.queueRoleNames";

	/** location based access module: the locations a user may work in */
	private static final String USER_LOCATIONS_PROPERTY = "locationUuid";

	/** location based access module: the person attribute type holding a patient's location */
	private static final String PATIENT_LOCATION_ATTRIBUTE_GP = "locationbasedaccess.locationAttributeUuid";

	private static final String STOCK_APPROVE_PRIVILEGE = "Task: stockmanagement.stockoperations.approve";

	/*
	 * core Alert has no link to what it is about, so the type, a dedupe key (whose first part is the
	 * referenced uuid), the patient uuid and the uuid of the location it happened at ride along in the
	 * text; they are stripped before the message is shown. "[order:...]" is the marker lab result alerts used before other types existed.
	 */
	private static final Pattern TYPE_MARKER = Pattern.compile("\\[n:([A-Z_]+):([^\\]]+)\\]");

	private static final Pattern LEGACY_ORDER_MARKER = Pattern.compile("\\[order:([^\\]]+)\\]");

	private static final Pattern PATIENT_MARKER = Pattern.compile("\\[patient:([^\\]]+)\\]");

	private static final Pattern LOCATION_MARKER = Pattern.compile("\\[loc:([^\\]]+)\\]");

	private static final Pattern ANY_MARKER = Pattern.compile("\\[(n|order|patient|loc):[^\\]]*\\]");

	/** stock management's StockBatchExpiryJob, StockRuleEvaluationJob and stock operation alerts */
	private static final Pattern STOCK_EXPIRY_TEXT = Pattern.compile("^Batch .* expires on .*");

	private static final String LOW_STOCK_TEXT_PREFIX = "Stock alert:";

	private static final String STOCK_OPERATION_TEXT = ": Stock Operation ";

	private NotificationDAO dao;

	public void setDao(NotificationDAO dao) {
		this.dao = dao;
	}

	@Override
	@Transactional
	public void notifyLabResultEntered(String orderUuid) {
		Order order = Context.getOrderService().getOrderByUuid(orderUuid);
		if (!(order instanceof TestOrder) || order.getVoided()
		        || order.getFulfillerStatus() != Order.FulfillerStatus.COMPLETED) {
			return;
		}
		if (exists(NotificationType.LAB_RESULT, orderUuid) || !dao.getAlertsContaining("[order:" + orderUuid + "]").isEmpty()) {
			return;
		}

		Set<User> recipients = new LinkedHashSet<>();
		if (order.getOrderer() != null) {
			addUsersOf(recipients, order.getOrderer().getPerson());
		}
		Location location = locationOf(order.getEncounter());
		recipients.addAll(usersWithRoles(roleNames(GP_LAB_RESULT_ROLES), location));

		Patient patient = order.getPatient();
		create(NotificationType.LAB_RESULT, orderUuid, patient, location,
		    "Lab result ready: " + order.getConcept().getDisplayString() + " for " + describe(patient), recipients, 30);
	}

	@Override
	@Transactional
	public void notifyOrderPlaced(String orderUuid) {
		Order order = Context.getOrderService().getOrderByUuid(orderUuid);
		if (order == null || order.getVoided() || order.getAction() != Order.Action.NEW || order.getEncounter() == null) {
			return;
		}
		NotificationType type;
		String rolesGp;
		String label;
		Class<? extends Order> orderClass;
		if (order instanceof TestOrder) {
			type = NotificationType.LAB_ORDER;
			rolesGp = GP_LAB_ORDER_ROLES;
			label = "New lab order";
			orderClass = TestOrder.class;
		} else if (order instanceof DrugOrder) {
			type = NotificationType.MEDICATION_ORDER;
			rolesGp = GP_MEDICATION_ORDER_ROLES;
			label = "New medication order";
			orderClass = DrugOrder.class;
		} else {
			return;
		}

		// one notification per encounter, listing every order of this kind placed in it
		Encounter encounter = order.getEncounter();
		List<String> orderNames = encounter.getOrders().stream()
		        .filter(o -> orderClass.isInstance(o) && !o.getVoided() && o.getAction() == Order.Action.NEW)
		        .sorted((a, b) -> a.getOrderId().compareTo(b.getOrderId())).map(NotificationServiceImpl::orderName)
		        .distinct().collect(Collectors.toList());

		Set<User> recipients = usersWithRoles(roleNames(rolesGp), locationOf(encounter));
		recipients.remove(order.getCreator());
		if (recipients.isEmpty()) {
			return;
		}

		Patient patient = order.getPatient();
		String orderedBy = order.getOrderer() == null ? "" : " (ordered by " + providerName(order) + ")";
		String message = label + (orderNames.size() > 1 ? "s" : "") + " for " + describe(patient) + ": "
		        + String.join(", ", orderNames) + orderedBy;

		List<Alert> existing = dao.getAlertsContaining(marker(type, encounter.getUuid()));
		if (existing.isEmpty()) {
			create(type, encounter.getUuid(), patient, encounter.getLocation(), message, recipients, 7);
			return;
		}
		// a later order event of the same encounter: refresh the list, reach any new recipients
		Alert alert = existing.get(0);
		String text = text(type, encounter.getUuid(), patient, encounter.getLocation(), message);
		boolean changed = !text.equals(alert.getText());
		alert.setText(text);
		for (User user : recipients) {
			if (alert.getRecipient(user) == null) {
				alert.addRecipient(user);
				changed = true;
			}
		}
		if (changed) {
			Context.getAlertService().saveAlert(alert);
		}
	}

	@Override
	@Transactional
	public void notifyPatientRegistered(String patientUuid) {
		Patient patient = Context.getPatientService().getPatientByUuid(patientUuid);
		if (patient == null || patient.getVoided() || exists(NotificationType.PATIENT_REGISTERED, patientUuid)) {
			return;
		}
		Location location = registrationLocationOf(patient);
		Set<User> recipients = usersWithRoles(roleNames(GP_PATIENT_REGISTERED_ROLES), location);
		recipients.remove(patient.getCreator());
		create(NotificationType.PATIENT_REGISTERED, patientUuid, patient, location,
		    "New patient registered: " + describe(patient), recipients, 7);
	}

	@Override
	@Transactional
	public void notifyPatientQueued(String queueEntryUuid) {
		Object[] entry = dao.getActiveQueueEntry(queueEntryUuid);
		if (entry == null || exists(NotificationType.PATIENT_QUEUED, queueEntryUuid)) {
			return;
		}
		Patient patient = Context.getPatientService().getPatientByUuid((String) entry[0]);
		if (patient == null) {
			return;
		}
		String queueName = (String) entry[1];
		Location location = entry[2] == null ? null : Context.getLocationService().getLocation(toInt(entry[2]));

		Set<User> recipients = new LinkedHashSet<>();
		if (entry[3] != null) {
			addUsersOf(recipients, Context.getPersonService().getPerson(toInt(entry[3])));
		} else {
			recipients.addAll(usersWithRoles(queueRoleNames(queueName), location));
		}
		removeUser(recipients, entry[4]);

		String comingFrom = entry[5] == null ? "" : " (sent from " + entry[5] + ")";
		create(NotificationType.PATIENT_QUEUED, queueEntryUuid, patient, location,
		    describe(patient) + " is waiting in " + queueName + comingFrom, recipients, 1);
	}

	@Override
	@Transactional
	public void notifyStockOperationChanged(String stockOperationUuid) {
		Object[] op = dao.getStockOperation(stockOperationUuid);
		if (op == null) {
			return;
		}
		String status = (String) op[0];
		Location location = op[3] == null ? null : Context.getLocationService().getLocation(toInt(op[3]));
		String what = op[2] + " " + op[1] + (location == null ? "" : " at " + location.getName());
		Date submittedDate = (Date) op[9];
		// a resubmission after RETURNED is a new request, and must notify again
		String key = stockOperationUuid + ":" + status + ":" + (submittedDate == null ? 0 : submittedDate.getTime());

		if (!"SUBMITTED".equals(status)) {
			withdrawPendingApprovals(stockOperationUuid);
		}
		if (exists(NotificationType.STOCK_OPERATION, key)) {
			return;
		}

		Set<User> recipients = new LinkedHashSet<>();
		String message;
		switch (status) {
			case "SUBMITTED":
				recipients.addAll(stockApprovers(toInt(op[3]), toInt(op[4])));
				User submitter = op[5] == null ? null : Context.getUserService().getUser(toInt(op[5]));
				message = "Stock operation waiting for approval: " + what
				        + (submitter == null ? "" : " (submitted by " + userName(submitter) + ")");
				break;
			case "DISPATCHED":
				message = "Stock operation approved and dispatched: " + what;
				break;
			case "COMPLETED":
				message = "Stock operation approved and completed: " + what;
				break;
			case "REJECTED":
				message = "Stock operation rejected: " + what + reason(op[10]);
				break;
			case "RETURNED":
				message = "Stock operation returned for changes: " + what + reason(op[11]);
				break;
			default:
				return;
		}
		if (!"SUBMITTED".equals(status)) {
			// only operations that went through approval report back to whoever submitted them
			if (submittedDate == null) {
				return;
			}
			Object submitterId = op[5] != null ? op[5] : op[6];
			User submitter = Context.getUserService().getUser(toInt(submitterId));
			if (submitter != null && !submitter.getRetired()) {
				recipients.add(submitter);
			}
		}
		// the user who just acted on it already knows
		removeUser(recipients, "SUBMITTED".equals(status) ? op[5] : op[7]);
		create(NotificationType.STOCK_OPERATION, key, null, location, message, recipients, 14);
	}

	@Override
	@Transactional(readOnly = true)
	public List<NotificationRow> getUnreadNotificationsForCurrentUser() {
		List<NotificationRow> rows = new ArrayList<>();
		for (Alert alert : alertsAtSessionLocation()) {
			String text = alert.getText();
			NotificationRow row = new NotificationRow();
			row.setId(alert.getAlertId());
			row.setDateCreated(alert.getDateCreated());
			row.setPatientUuid(firstGroup(PATIENT_MARKER, text));
			row.setMessage(ANY_MARKER.matcher(text).replaceAll("").trim());

			Matcher typeMarker = TYPE_MARKER.matcher(text);
			Matcher legacyMarker = LEGACY_ORDER_MARKER.matcher(text);
			if (typeMarker.find()) {
				row.setType(typeOf(typeMarker.group(1)).name());
				row.setReferenceUuid(typeMarker.group(2).split(":")[0]);
			} else if (legacyMarker.find()) {
				row.setType(NotificationType.LAB_RESULT.name());
				row.setReferenceUuid(legacyMarker.group(1));
			} else {
				row.setType(inferTypeOfForeignAlert(text).name());
			}
			rows.add(row);
		}
		// core orders by dateChanged ascending; the bell wants the newest first
		rows.sort((a, b) -> b.getDateCreated().compareTo(a.getDateCreated()));
		return rows;
	}

	@Override
	@Transactional
	public void markRead(Integer alertId) {
		Alert alert = Context.getAlertService().getAlert(alertId);
		if (alert == null || alert.getRecipient(Context.getAuthenticatedUser()) == null) {
			return;
		}
		saveAsRead(alert);
	}

	@Override
	@Transactional
	public void markAllRead() {
		// only what the bell shows; notifications of the user's other locations stay unread
		for (Alert alert : alertsAtSessionLocation()) {
			saveAsRead(alert);
		}
	}

	/**
	 * The current user's unread alerts that belong to the location they logged in at: alerts that
	 * happened there or at a location inside it. Alerts that carry no location (other modules' alerts,
	 * ones created before locations were recorded) show everywhere, as does everything when the
	 * session has no location.
	 */
	private List<Alert> alertsAtSessionLocation() {
		Location sessionLocation = Context.getUserContext().getLocation();
		List<Alert> alerts = new ArrayList<>();
		for (Alert alert : dao.getUnreadAlertsFor(Context.getAuthenticatedUser())) {
			String text = alert.getText();
			if (text == null) {
				continue;
			}
			String locationUuid = firstGroup(LOCATION_MARKER, text);
			if (sessionLocation == null || locationUuid == null
			        || isAtOrInside(Context.getLocationService().getLocationByUuid(locationUuid), sessionLocation)) {
				alerts.add(alert);
			}
		}
		return alerts;
	}

	private static boolean isAtOrInside(Location location, Location ancestor) {
		Set<Location> seen = new HashSet<>();
		for (Location l = location; l != null && seen.add(l); l = l.getParentLocation()) {
			if (l.getUuid().equals(ancestor.getUuid())) {
				return true;
			}
		}
		return false;
	}

	/** Recipients mark alerts read, but saving one needs Manage Alerts, which clinicians lack. */
	private void saveAsRead(Alert alert) {
		alert.markAlertRead();
		try {
			Context.addProxyPrivilege(PrivilegeConstants.MANAGE_ALERTS);
			Context.getAlertService().saveAlert(alert);
		}
		finally {
			Context.removeProxyPrivilege(PrivilegeConstants.MANAGE_ALERTS);
		}
	}

	/** Expires every approver's "waiting for approval" alert of the operation. */
	private void withdrawPendingApprovals(String stockOperationUuid) {
		Date now = new Date();
		for (Alert alert : dao.getAlertsContaining(
		    "[n:" + NotificationType.STOCK_OPERATION + ":" + stockOperationUuid + ":SUBMITTED:")) {
			if (alert.getDateToExpire() == null || alert.getDateToExpire().after(now)) {
				alert.setDateToExpire(now);
				Context.getAlertService().saveAlert(alert);
			}
		}
	}

	private void create(NotificationType type, String key, Patient patient, Location location, String message,
	        Collection<User> recipients, int expireAfterDays) {
		if (recipients.isEmpty()) {
			log.debug("No one to notify for {} {}", type, key);
			return;
		}
		Alert alert = new Alert(text(type, key, patient, location, message), recipients);
		alert.setSatisfiedByAny(false);
		Calendar expiry = Calendar.getInstance();
		expiry.add(Calendar.DAY_OF_MONTH, expireAfterDays);
		alert.setDateToExpire(expiry.getTime());
		Context.getAlertService().saveAlert(alert);
	}

	private static String text(NotificationType type, String key, Patient patient, Location location, String message) {
		String markers = marker(type, key) + (patient == null ? "" : "[patient:" + patient.getUuid() + "]")
		        + (location == null ? "" : "[loc:" + location.getUuid() + "]");
		return StringUtils.abbreviate(message, Alert.TEXT_MAX_LENGTH - markers.length() - 1) + " " + markers;
	}

	private static String marker(NotificationType type, String key) {
		return "[n:" + type.name() + ":" + key + "]";
	}

	private boolean exists(NotificationType type, String key) {
		return !dao.getAlertsContaining(marker(type, key)).isEmpty();
	}

	private Set<User> stockApprovers(Integer locationId, Integer operationTypeId) {
		UserService userService = Context.getUserService();
		Set<User> approvers = new LinkedHashSet<>();
		for (Object[] scope : dao.getStockRoleScopes(locationId, operationTypeId)) {
			Role role = userService.getRole((String) scope[1]);
			if (role == null || !grants(role, STOCK_APPROVE_PRIVILEGE)) {
				continue;
			}
			User user = userService.getUser(toInt(scope[0]));
			if (user != null && !user.getRetired()) {
				approvers.add(user);
			}
		}
		return approvers;
	}

	/** Role.hasPrivilege ignores inherited roles. */
	private static boolean grants(Role role, String privilege) {
		if (role.hasPrivilege(privilege)) {
			return true;
		}
		for (Role parent : role.getAllParentRoles()) {
			if (parent.hasPrivilege(privilege)) {
				return true;
			}
		}
		return false;
	}

	/** Active users holding any of the roles, limited to those who may work at the location. */
	private Set<User> usersWithRoles(Collection<String> roleNames, Location location) {
		UserService userService = Context.getUserService();
		Set<User> users = new LinkedHashSet<>();
		for (String roleName : roleNames) {
			Role role = userService.getRole(roleName);
			if (role == null) {
				log.warn("Notification settings list unknown role '{}'", roleName);
				continue;
			}
			for (User user : userService.getUsersByRole(role)) {
				if (!user.getRetired() && worksAt(user, location)) {
					users.add(user);
				}
			}
		}
		return users;
	}

	/**
	 * Users without the location based access property may work anywhere. The property may name a
	 * parent of the location.
	 */
	private static boolean worksAt(User user, Location location) {
		String property = user.getUserProperty(USER_LOCATIONS_PROPERTY);
		if (location == null || StringUtils.isBlank(property)) {
			return true;
		}
		Set<String> uuids = Arrays.stream(property.split(",")).map(String::trim).collect(Collectors.toSet());
		Set<Location> seen = new HashSet<>();
		for (Location l = location; l != null && seen.add(l); l = l.getParentLocation()) {
			if (uuids.contains(l.getUuid())) {
				return true;
			}
		}
		return false;
	}

	private static List<String> roleNames(String globalProperty) {
		String value = Context.getAdministrationService().getGlobalProperty(globalProperty);
		if (StringUtils.isBlank(value)) {
			return new ArrayList<>();
		}
		return Arrays.stream(value.split(",")).map(String::trim).filter(StringUtils::isNotEmpty)
		        .collect(Collectors.toList());
	}

	/**
	 * Entries of {@code queueRoleNames} are either a role (every queue) or {@code Queue name=Role}.
	 */
	private static List<String> queueRoleNames(String queueName) {
		List<String> roles = new ArrayList<>();
		for (String entry : roleNames(GP_QUEUE_ROLES)) {
			int equals = entry.indexOf('=');
			if (equals < 0) {
				roles.add(entry);
			} else if (entry.substring(0, equals).trim().equalsIgnoreCase(queueName)) {
				roles.add(entry.substring(equals + 1).trim());
			}
		}
		return roles;
	}

	private static Location locationOf(Encounter encounter) {
		return encounter == null ? null : encounter.getLocation();
	}

	/** The location based access module's location attribute, which registration sets. */
	private static Location registrationLocationOf(Patient patient) {
		String typeUuid = Context.getAdministrationService().getGlobalProperty(PATIENT_LOCATION_ATTRIBUTE_GP);
		if (StringUtils.isBlank(typeUuid)) {
			return null;
		}
		PersonAttributeType type = Context.getPersonService().getPersonAttributeTypeByUuid(typeUuid);
		PersonAttribute attribute = type == null ? null : patient.getAttribute(type);
		return attribute == null ? null : Context.getLocationService().getLocationByUuid(attribute.getValue());
	}

	private static void addUsersOf(Set<User> recipients, Person person) {
		if (person == null) {
			return;
		}
		for (User user : Context.getUserService().getUsersByPerson(person, false)) {
			recipients.add(user);
		}
	}

	private static void removeUser(Set<User> recipients, Object userId) {
		if (userId != null) {
			int id = toInt(userId);
			recipients.removeIf(u -> u.getUserId() == id);
		}
	}

	private static String userName(User user) {
		return user.getPersonName() != null ? user.getPersonName().getFullName() : user.getUsername();
	}

	private static String providerName(Order order) {
		Person person = order.getOrderer().getPerson();
		return person != null && person.getPersonName() != null ? person.getPersonName().getFullName()
		        : order.getOrderer().getName();
	}

	private static String orderName(Order order) {
		if (order instanceof DrugOrder) {
			DrugOrder drugOrder = (DrugOrder) order;
			if (drugOrder.getDrug() != null) {
				return drugOrder.getDrug().getDisplayName();
			}
			if (StringUtils.isNotBlank(drugOrder.getDrugNonCoded())) {
				return drugOrder.getDrugNonCoded();
			}
		}
		return order.getConcept().getDisplayString();
	}

	private static String describe(Patient patient) {
		String name = patient.getPersonName() == null ? "" : patient.getPersonName().getFullName();
		PatientIdentifier identifier = patient.getPatientIdentifier();
		return identifier == null ? name : name + " (" + identifier.getIdentifier() + ")";
	}

	private static String reason(Object reason) {
		return reason == null || StringUtils.isBlank(reason.toString()) ? "" : " (" + reason + ")";
	}

	private static NotificationType typeOf(String name) {
		try {
			return NotificationType.valueOf(name);
		}
		catch (IllegalArgumentException e) {
			return NotificationType.GENERAL;
		}
	}

	/** Alerts this module did not create carry no marker; recognise stock management's by their wording. */
	private static NotificationType inferTypeOfForeignAlert(String text) {
		if (text.startsWith(LOW_STOCK_TEXT_PREFIX)) {
			return NotificationType.LOW_STOCK;
		}
		if (STOCK_EXPIRY_TEXT.matcher(text).matches()) {
			return NotificationType.STOCK_EXPIRY;
		}
		if (text.contains(STOCK_OPERATION_TEXT)) {
			return NotificationType.STOCK_OPERATION;
		}
		return NotificationType.GENERAL;
	}

	private static int toInt(Object number) {
		return ((Number) number).intValue();
	}

	private static String firstGroup(Pattern pattern, String text) {
		Matcher matcher = pattern.matcher(text);
		return matcher.find() ? matcher.group(1) : null;
	}
}
