package org.openmrs.module.labtestreport.notification;

import java.util.Arrays;
import java.util.List;

import javax.jms.MapMessage;
import javax.jms.Message;

import org.openmrs.DrugOrder;
import org.openmrs.Patient;
import org.openmrs.TestOrder;
import org.openmrs.api.context.Context;
import org.openmrs.api.context.Daemon;
import org.openmrs.event.Event;
import org.openmrs.event.EventListener;
import org.openmrs.module.DaemonToken;
import org.openmrs.module.labtestreport.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Receives the event module's messages for the entities the notification bell reports on, and
 * hands each one to {@link NotificationService}. Messages arrive on a JMS thread after the
 * entity's transaction has committed, with no OpenMRS user, so the work runs as the daemon user.
 */
public class NotificationEventListener implements EventListener {

	private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

	private static final String CREATED = Event.Action.CREATED.name();

	private static final String UPDATED = Event.Action.UPDATED.name();

	/* queue and stock management classes, named rather than referenced so neither module is a dependency */
	private static final String QUEUE_ENTRY = "org.openmrs.module.queue.model.QueueEntry";

	private static final String STOCK_OPERATION = "org.openmrs.module.stockmanagement.api.model.StockOperation";

	/** event topics are "ACTION:fully.qualified.ClassName", one per concrete class */
	public static final List<String> TOPICS = Arrays.asList(topic(CREATED, TestOrder.class.getName()),
	    topic(UPDATED, TestOrder.class.getName()), topic(CREATED, DrugOrder.class.getName()),
	    topic(CREATED, Patient.class.getName()), topic(CREATED, QUEUE_ENTRY), topic(CREATED, STOCK_OPERATION),
	    topic(UPDATED, STOCK_OPERATION));

	private final DaemonToken daemonToken;

	public NotificationEventListener(DaemonToken daemonToken) {
		this.daemonToken = daemonToken;
	}

	@Override
	public void onMessage(Message message) {
		try {
			MapMessage map = (MapMessage) message;
			String uuid = map.getString("uuid");
			String topic = topic(map.getString("action"), map.getString("classname"));
			// wait, so messages are handled one at a time and each dedupe check holds
			Daemon.runInDaemonThreadAndWait(() -> {
				try {
					handle(topic, uuid);
				}
				catch (Exception e) {
					log.error("Failed to create notifications for {} {}", topic, uuid, e);
				}
			}, daemonToken);
		}
		catch (Exception e) {
			log.error("Failed to handle notification event", e);
		}
	}

	private static void handle(String topic, String uuid) {
		NotificationService service = Context.getService(NotificationService.class);
		if (topic.equals(topic(UPDATED, TestOrder.class.getName()))) {
			service.notifyLabResultEntered(uuid);
		} else if (topic.equals(topic(CREATED, TestOrder.class.getName()))
		        || topic.equals(topic(CREATED, DrugOrder.class.getName()))) {
			service.notifyOrderPlaced(uuid);
		} else if (topic.equals(topic(CREATED, Patient.class.getName()))) {
			service.notifyPatientRegistered(uuid);
		} else if (topic.equals(topic(CREATED, QUEUE_ENTRY))) {
			service.notifyPatientQueued(uuid);
		} else if (topic.endsWith(":" + STOCK_OPERATION)) {
			service.notifyStockOperationChanged(uuid);
		}
	}

	private static String topic(String action, String className) {
		return action + ":" + className;
	}
}
