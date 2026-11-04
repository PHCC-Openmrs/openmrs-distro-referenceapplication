package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.MonthlyHealthPromotionRow;
import org.openmrs.module.labtestreport.MonthlyHealthPromotionService;
import org.openmrs.module.labtestreport.PatientRow;
import org.openmrs.module.labtestreport.db.MonthlyHealthPromotionDAO;

public class MonthlyHealthPromotionServiceImpl extends BaseOpenmrsService implements MonthlyHealthPromotionService {

	static final String INDIVIDUAL = "individual";

	static final String GROUP = "group";

	static final String FOLLOW_UP = "followUp";

	static final String ALL = "all";

	private static final String[] AGE_GROUPS = { "0-4", "5-14", "15-18", "19-49", "50-65", "65+" };

	private static final String[] GENDERS = { "M", "F" };

	private static final String[][] SESSION_TYPES = { { INDIVIDUAL, "Individual Sessions" }, { GROUP, "Group Sessions" },
	        { FOLLOW_UP, "Follow up cases" } };

	private static final String NO_SUBJECT = "Not specified";

	private MonthlyHealthPromotionDAO dao;

	public void setDao(MonthlyHealthPromotionDAO dao) {
		this.dao = dao;
	}

	/** A single Health Promotion Session submission, placed in the grid. */
	private static final class Session {

		int patientId;

		int encounterId;

		Date date;

		/** INDIVIDUAL, GROUP, or null if the form recorded neither. */
		String typeKey;

		String subject;

		String ageGroup;

		String gender;

		/** True when the patient attended an earlier session (even before the reporting period). */
		boolean followUp;
	}

	@Override
	public List<MonthlyHealthPromotionRow> getReport(Date startDate, Date endDate, String locationUuid, String subject) {
		List<Session> sessions = loadSessions(startDate, endDate, locationUuid);
		if (subject != null && !subject.trim().isEmpty()) {
			// Filtered after follow-up detection, so a follow-up is still judged against the patient's whole history.
			sessions.removeIf(session -> !session.subject.equalsIgnoreCase(subject.trim()));
		}

		// Subjects are free text, so the rows are whatever was actually recorded. Grouped
		// case-insensitively; the first spelling seen is the one displayed.
		Map<String, String> subjectLabels = new TreeMap<>();
		for (Session session : sessions) {
			subjectLabels.putIfAbsent(session.subject.toLowerCase(Locale.ROOT), session.subject);
		}

		List<MonthlyHealthPromotionRow> rows = new ArrayList<>();
		for (String[] type : SESSION_TYPES) {
			rows.add(buildRow(sessions, type[0], type[1], null));
			for (String rowSubject : subjectLabels.values()) {
				MonthlyHealthPromotionRow row = buildRow(sessions, type[0], type[1], rowSubject);
				if (row.getTotal() > 0) {
					rows.add(row);
				}
			}
		}
		rows.add(buildRow(sessions, ALL, "Grand Total", null));
		return rows;
	}

	@Override
	public List<String> getSubjects(Date startDate, Date endDate, String locationUuid) {
		Map<String, String> labels = new TreeMap<>();
		for (Session session : loadSessions(startDate, endDate, locationUuid)) {
			labels.putIfAbsent(session.subject.toLowerCase(Locale.ROOT), session.subject);
		}
		return new ArrayList<>(labels.values());
	}

	@Override
	public List<PatientRow> getPatientsForCell(String sessionTypeKey, String subject, String gender, String ageGroup,
	        Date startDate, Date endDate, String locationUuid) {
		Set<Integer> patientIds = new LinkedHashSet<>();
		for (Session session : loadSessions(startDate, endDate, locationUuid)) {
			if (matches(session, sessionTypeKey, subject) && (ageGroup == null || ageGroup.equals(session.ageGroup))
			        && (gender == null || gender.equals(session.gender))) {
				patientIds.add(session.patientId);
			}
		}
		List<PatientRow> rows = new ArrayList<>();
		if (patientIds.isEmpty()) {
			return rows;
		}
		for (Object[] r : dao.getPatients(patientIds)) {
			PatientRow row = new PatientRow();
			row.setPatientId(((Number) r[0]).intValue());
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setFamilyName((String) r[3]);
			row.setIdentifier((String) r[4]);
			row.setSex((String) r[5]);
			row.setNationalId((String) r[6]);
			row.setPhoneNumber((String) r[7]);
			if (r.length > 8) {
				row.setMiddleName((String) r[8]);
			}
			rows.add(row);
		}
		return rows;
	}

	private MonthlyHealthPromotionRow buildRow(List<Session> sessions, String typeKey, String typeLabel,
	        String subject) {
		MonthlyHealthPromotionRow row = new MonthlyHealthPromotionRow();
		row.setSessionTypeKey(typeKey);
		row.setSessionType(typeLabel);
		row.setSubject(subject);
		for (String ageGroup : AGE_GROUPS) {
			for (String gender : GENDERS) {
				row.getCounts().put(ageGroup + "_" + gender, 0L);
			}
		}
		// Each cell counts distinct patients, so a patient who attended several sessions of the same
		// kind counts once -- which is also what the drill-down lists.
		Map<String, Set<Integer>> patientsByCell = new LinkedHashMap<>();
		Set<Integer> totalPatients = new HashSet<>();
		for (Session session : sessions) {
			if (!matches(session, typeKey, subject)) {
				continue;
			}
			totalPatients.add(session.patientId);
			if (session.ageGroup != null && session.gender != null) {
				patientsByCell.computeIfAbsent(session.ageGroup + "_" + session.gender, k -> new HashSet<>())
				        .add(session.patientId);
			}
		}
		for (Map.Entry<String, Set<Integer>> entry : patientsByCell.entrySet()) {
			row.getCounts().put(entry.getKey(), (long) entry.getValue().size());
		}
		// Like the other age/gender reports, a patient with no recorded age or a non-M/F gender still
		// counts towards the total even though there's no column to show them in.
		row.setTotal(totalPatients.size());
		return row;
	}

	private static boolean matches(Session session, String typeKey, String subject) {
		boolean typeMatches;
		if (ALL.equals(typeKey)) {
			typeMatches = true;
		} else if (FOLLOW_UP.equals(typeKey)) {
			typeMatches = session.followUp;
		} else {
			typeMatches = typeKey.equals(session.typeKey);
		}
		return typeMatches && (subject == null || subject.equalsIgnoreCase(session.subject));
	}

	/** Every session at the location, with follow-ups flagged, trimmed to the reporting period. */
	private List<Session> loadSessions(Date startDate, Date endDate, String locationUuid) {
		List<Session> all = new ArrayList<>();
		for (Object[] r : dao.getEvents(locationUuid)) {
			Session session = new Session();
			session.patientId = ((Number) r[0]).intValue();
			session.encounterId = ((Number) r[1]).intValue();
			session.date = (Date) r[2];
			session.typeKey = typeKeyOf((String) r[3]);
			String topic = r[4] == null ? "" : ((String) r[4]).trim();
			session.subject = topic.isEmpty() ? NO_SUBJECT : topic;
			session.ageGroup = r[5] == null ? null : ageGroupOf(((Number) r[5]).doubleValue());
			session.gender = (String) r[6];
			all.add(session);
		}

		all.sort(Comparator.<Session>comparingInt(s -> s.patientId).thenComparing(s -> s.date)
		        .thenComparingInt(s -> s.encounterId));
		Integer previousPatient = null;
		for (Session session : all) {
			session.followUp = previousPatient != null && previousPatient == session.patientId;
			previousPatient = session.patientId;
		}

		Date endExclusive = endDate == null ? null : startOfNextDay(endDate);
		List<Session> inPeriod = new ArrayList<>();
		for (Session session : all) {
			if ((startDate == null || !session.date.before(startDate))
			        && (endExclusive == null || session.date.before(endExclusive))) {
				inPeriod.add(session);
			}
		}
		return inPeriod;
	}

	private static String typeKeyOf(String sessionType) {
		if (sessionType == null) {
			return null;
		}
		String lower = sessionType.toLowerCase(Locale.ROOT);
		if (lower.startsWith("individual")) {
			return INDIVIDUAL;
		}
		if (lower.startsWith("group")) {
			return GROUP;
		}
		return null;
	}

	private static String ageGroupOf(double age) {
		if (age < 0) {
			return null;
		}
		if (age < 5) {
			return "0-4";
		}
		if (age < 15) {
			return "5-14";
		}
		if (age < 19) {
			return "15-18";
		}
		if (age < 50) {
			return "19-49";
		}
		if (age < 66) {
			return "50-65";
		}
		return "65+";
	}

	private static Date startOfNextDay(Date date) {
		Calendar calendar = Calendar.getInstance();
		calendar.setTime(date);
		calendar.set(Calendar.HOUR_OF_DAY, 0);
		calendar.set(Calendar.MINUTE, 0);
		calendar.set(Calendar.SECOND, 0);
		calendar.set(Calendar.MILLISECOND, 0);
		calendar.add(Calendar.DAY_OF_MONTH, 1);
		return calendar.getTime();
	}
}
