package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.PatientRow;
import org.openmrs.module.labtestreport.RhActivityReportRow;
import org.openmrs.module.labtestreport.RhActivityReportService;
import org.openmrs.module.labtestreport.db.RhActivityReportDAO;

public class RhActivityReportServiceImpl extends BaseOpenmrsService implements RhActivityReportService {

	private static final String[] AGE_GROUPS = { "0-4", "5-14", "15-18", "19-49", "50-65", "65+" };

	private static final String[] GENDERS = { "M", "F" };

	/**
	 * The report's rows, in the order (and with the wording) of the paper Reproductive Health
	 * Activity Report. Each key must match an indicator_key emitted by rh_activity_report_events.sql,
	 * except for rows marked not captured.
	 */
	private static final List<RowDefinition> ROWS = Arrays.asList(
	    new RowDefinition("Antenatal Care", "ancFirstVisitBeforeFirstTrimester", "First antenatal visit < 1st trimester"),
	    new RowDefinition("Antenatal Care", "ancFirstVisitAfterFirstTrimester", "First antenatal visit > 1st trimester"),
	    new RowDefinition("Antenatal Care", "ancSecondVisit", "Second antenatal visit"),
	    new RowDefinition("Antenatal Care", "ancThirdVisit", "Third antenatal visit"),
	    new RowDefinition("Antenatal Care", "ancFourOrMoreVisits", "Four or more antenatal visits"),
	    // Nothing on the SRH form records pregnancy risk yet.
	    new RowDefinition("Antenatal Care", "highRiskPregnancies", "Number of high risk pregnancies detected"),
	    new RowDefinition("Postnatal Care", "pncWithin72Hours",
	            "Number of women and newborns receiving PNC within 72 hours of delivery"),
	    new RowDefinition("Postnatal Care", "pncAfter72Hours",
	            "Number of women and newborns receiving PNC after 72 hours of delivery"),
	    new RowDefinition("Gynecological Cases", "stisTreated", "Number of STIs treated"),
	    new RowDefinition("Gynecological Cases", "gynecologicalCases", "Gynecological cases"),
	    new RowDefinition("Referrals", "ancCasesReferred", "ANC cases referred"),
	    new RowDefinition("Referrals", "deliveriesReferred", "Deliveries referred"),
	    new RowDefinition("Referrals", "newbornsReferred", "Newborn referred"),
	    new RowDefinition("Family Planning", "fpNewVisit", "New visit"),
	    new RowDefinition("Family Planning", "fpRevisit", "Revisit"),
	    new RowDefinition("Family Planning", "fpCocp", "COCP - low/high dose"),
	    new RowDefinition("Family Planning", "fpPop", "POP - low/high dose"),
	    new RowDefinition("Family Planning", "fpEmergencyContraceptives", "Emergency contraceptives"),
	    new RowDefinition("Family Planning", "fpInjectable", "Injectable"),
	    new RowDefinition("Family Planning", "fpMaleCondom", "Male Condom"),
	    new RowDefinition("Family Planning", "fpIucd", "IUCD insertion/removal"),
	    new RowDefinition("PCC", "preConceptionCare", "PCC"),
	    new RowDefinition("Pediatric Cases", "pediatricCases", "Pediatric cases"),
	    new RowDefinition("Total", "totalPatients", "Total number of patients seen across all RH services"));

	private RhActivityReportDAO dao;

	public void setDao(RhActivityReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<RhActivityReportRow> getReport(Date startDate, Date endDate, String locationUuid) {
		Map<String, RhActivityReportRow> rowsByKey = new LinkedHashMap<>();
		for (RowDefinition definition : ROWS) {
			RhActivityReportRow row = new RhActivityReportRow();
			row.setSection(definition.section);
			row.setIndicatorKey(definition.key);
			row.setLabel(definition.label);
			row.setCaptured(definition.captured);
			for (String ageGroup : AGE_GROUPS) {
				for (String gender : GENDERS) {
					row.getCounts().put(cellKey(ageGroup, gender), 0L);
				}
			}
			rowsByKey.put(definition.key, row);
		}

		for (Object[] event : dao.getEvents(startDate, endDate, locationUuid)) {
			RhActivityReportRow row = rowsByKey.get((String) event[0]);
			if (row == null) {
				continue;
			}
			// Patients recorded with a gender other than M/F still count towards the row total, the
			// same as the EWARS report, even though there's no column to show them in.
			row.setTotal(row.getTotal() + 1);
			row.getCounts().computeIfPresent(cellKey((String) event[2], (String) event[3]), (key, count) -> count + 1);
		}
		return new ArrayList<>(rowsByKey.values());
	}

	@Override
	public List<PatientRow> getPatientsForCell(String indicatorKey, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid) {
		Set<Integer> patientIds = new LinkedHashSet<>();
		for (Object[] event : dao.getEvents(startDate, endDate, locationUuid)) {
			if (indicatorKey.equals(event[0]) && (ageGroup == null || ageGroup.equals(event[2]))
			        && (gender == null || gender.equals(event[3]))) {
				patientIds.add(((Number) event[1]).intValue());
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

	private static String cellKey(String ageGroup, String gender) {
		return ageGroup + "_" + gender;
	}

	private static final class RowDefinition {

		private final String section;

		private final String key;

		private final String label;

		private final boolean captured;

		private RowDefinition(String section, String key, String label) {
			this(section, key, label, true);
		}

		private RowDefinition(String section, String key, String label, boolean captured) {
			this.section = section;
			this.key = key;
			this.label = label;
			this.captured = captured;
		}
	}
}
