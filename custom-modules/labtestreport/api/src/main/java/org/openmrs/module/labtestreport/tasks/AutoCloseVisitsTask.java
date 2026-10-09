package org.openmrs.module.labtestreport.tasks;

import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.hibernate.type.IntegerType;
import org.openmrs.Visit;
import org.openmrs.api.VisitService;
import org.openmrs.api.context.Context;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.scheduler.tasks.AbstractTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Ends every still-open visit at the clinic's daily closing time, so patients don't linger in the
 * service queues overnight. Before a visit is ended, any of its queue entries still "In Service"
 * are marked "Finished Service", so the patient leaves the queue as served rather than mid-service.
 * The queue module's "Auto Close Visit Queue Entries" task then ends their queue entries within a
 * minute.
 * <p>
 * The closing time is evaluated in the clinic's own timezone rather than the server's (which is
 * UTC), so it stays at the same wall-clock time across daylight saving changes. That's why this
 * runs every minute instead of once a day: a fixed-interval schedule anchored in UTC would drift by
 * an hour twice a year. All visits found by a run are ended together with the same stop time.
 * <p>
 * Each run closes active visits that started before the most recent closing time. That makes it
 * idempotent and self-healing: running it repeatedly is harmless, and if the server was down at
 * closing time the next run still catches up. A visit started after closing time stays open until
 * the following day's closing time.
 * <p>
 * Scheduler threads have no Hibernate session spanning the run, so visits loaded by one service
 * call are detached by the next and endVisit fails on their lazy encounters. Each visit is
 * therefore re-loaded and ended inside its own transaction, which also keeps one bad visit from
 * rolling back the rest.
 */
public class AutoCloseVisitsTask extends AbstractTask {

	private static final Logger log = LoggerFactory.getLogger(AutoCloseVisitsTask.class);

	public static final String GP_CLOSE_TIME = "labtestreport.autoCloseVisits.time";

	public static final String GP_TIMEZONE = "labtestreport.autoCloseVisits.timezone";

	private static final String DEFAULT_CLOSE_TIME = "17:00";

	private static final String DEFAULT_TIMEZONE = "Asia/Gaza";

	/* queue status concepts, matched in SQL so the queue module is not a dependency of this one */
	private static final String IN_SERVICE_STATUS_UUID = "ca7494ae-437f-4fd0-8aae-b88b9a2ba47d";

	private static final String FINISHED_SERVICE_STATUS_UUID = "b559fb77-4e1e-4285-b9b7-1d03e0ba983f";

	@Override
	public void execute() {
		if (isExecuting) {
			log.debug("AutoCloseVisitsTask is still executing, not running again");
			return;
		}
		startExecuting();
		try {
			closeVisits();
		}
		catch (Exception e) {
			log.error("Error while auto-closing visits", e);
		}
		finally {
			stopExecuting();
		}
	}

	private void closeVisits() {
		String closeTimeValue = Context.getAdministrationService().getGlobalProperty(GP_CLOSE_TIME, DEFAULT_CLOSE_TIME);
		if (StringUtils.isBlank(closeTimeValue)) {
			log.debug("{} is blank, visit auto-close is disabled", GP_CLOSE_TIME);
			return;
		}
		LocalTime closeTime;
		ZoneId zone;
		try {
			closeTime = LocalTime.parse(closeTimeValue.trim());
			zone = ZoneId.of(StringUtils.defaultIfBlank(
			    Context.getAdministrationService().getGlobalProperty(GP_TIMEZONE), DEFAULT_TIMEZONE).trim());
		}
		catch (DateTimeException e) {
			log.error("Invalid {} or {}, visit auto-close skipped: {}", GP_CLOSE_TIME, GP_TIMEZONE, e.getMessage());
			return;
		}

		Date cutoff = mostRecentCloseTime(ZonedDateTime.now(zone), closeTime);
		TransactionTemplate tx = new TransactionTemplate(
		        Context.getRegisteredComponent("transactionManager", PlatformTransactionManager.class));
		VisitService visitService = Context.getVisitService();
		DbSessionFactory sessionFactory = Context.getRegisteredComponent("dbSessionFactory", DbSessionFactory.class);
		List<Integer> openVisitIds = tx.execute(status -> visitService
		        .getVisits(null, null, null, null, null, cutoff, null, null, null, false, false).stream()
		        .map(Visit::getVisitId).collect(Collectors.toList()));
		if (openVisitIds == null || openVisitIds.isEmpty()) {
			return;
		}

		// One stop time for the whole batch, so every visit is ended at the same moment
		Date stopDatetime = new Date();
		log.info("Auto-closing {} visit(s) started before {} at {}", openVisitIds.size(), cutoff, stopDatetime);
		int closed = 0;
		for (Integer visitId : openVisitIds) {
			try {
				tx.executeWithoutResult(status -> {
					finishInServiceQueueEntries(sessionFactory, visitId, stopDatetime);
					visitService.endVisit(visitService.getVisit(visitId), stopDatetime);
				});
				closed++;
			}
			catch (Exception e) {
				log.warn("Unable to auto-close visit {}", visitId, e);
			}
		}
		log.info("Auto-closed {} of {} visit(s)", closed, openVisitIds.size());
	}

	/**
	 * Marks the visit's open queue entries that are still "In Service" as "Finished Service". Runs
	 * in the same transaction as ending the visit, so the two happen together or not at all.
	 */
	private void finishInServiceQueueEntries(DbSessionFactory sessionFactory, Integer visitId, Date changedAt) {
		Integer changedBy = Context.getAuthenticatedUser() == null ? null : Context.getAuthenticatedUser().getUserId();
		int finished = sessionFactory.getCurrentSession()
		        .createSQLQuery("update queue_entry set status = (select concept_id from concept where uuid = :finished),"
		                + " changed_by = :user, date_changed = :changedAt"
		                + " where visit_id = :visitId and voided = 0 and ended_at is null"
		                + " and status = (select concept_id from concept where uuid = :inService)")
		        .setParameter("finished", FINISHED_SERVICE_STATUS_UUID).setParameter("inService", IN_SERVICE_STATUS_UUID)
		        .setParameter("user", changedBy, IntegerType.INSTANCE).setParameter("changedAt", changedAt)
		        .setParameter("visitId", visitId).executeUpdate();
		if (finished > 0) {
			log.debug("Marked {} in-service queue entry(ies) of visit {} as finished", finished, visitId);
		}
	}

	/**
	 * @return today's closing time in the clinic's timezone if it has already passed, otherwise
	 *         yesterday's
	 */
	static Date mostRecentCloseTime(ZonedDateTime now, LocalTime closeTime) {
		ZonedDateTime closing = now.toLocalDate().atTime(closeTime).atZone(now.getZone());
		if (closing.isAfter(now)) {
			closing = closing.minusDays(1);
		}
		return Date.from(closing.toInstant());
	}
}
