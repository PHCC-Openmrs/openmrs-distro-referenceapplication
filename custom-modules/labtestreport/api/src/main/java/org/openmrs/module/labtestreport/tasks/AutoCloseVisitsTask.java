package org.openmrs.module.labtestreport.tasks;

import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.openmrs.Visit;
import org.openmrs.api.VisitService;
import org.openmrs.api.context.Context;
import org.openmrs.scheduler.tasks.AbstractTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Ends every still-open visit at the clinic's daily closing time, so patients don't linger in the
 * service queues overnight. The queue module's "Auto Close Visit Queue Entries" task then ends
 * their queue entries within a minute.
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
 */
public class AutoCloseVisitsTask extends AbstractTask {

	private static final Logger log = LoggerFactory.getLogger(AutoCloseVisitsTask.class);

	public static final String GP_CLOSE_TIME = "labtestreport.autoCloseVisits.time";

	public static final String GP_TIMEZONE = "labtestreport.autoCloseVisits.timezone";

	private static final String DEFAULT_CLOSE_TIME = "17:00";

	private static final String DEFAULT_TIMEZONE = "Asia/Gaza";

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
		VisitService visitService = Context.getVisitService();
		List<Visit> openVisits = visitService.getVisits(null, null, null, null, null, cutoff, null, null, null, false,
		    false);
		if (openVisits.isEmpty()) {
			return;
		}

		// One stop time for the whole batch, so every visit is ended at the same moment
		Date stopDatetime = new Date();
		log.info("Auto-closing {} visit(s) started before {} at {}", openVisits.size(), cutoff, stopDatetime);
		for (Visit visit : openVisits) {
			try {
				visitService.endVisit(visit, stopDatetime);
			}
			catch (Exception e) {
				log.warn("Unable to auto-close visit {}", visit.getUuid(), e);
			}
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
