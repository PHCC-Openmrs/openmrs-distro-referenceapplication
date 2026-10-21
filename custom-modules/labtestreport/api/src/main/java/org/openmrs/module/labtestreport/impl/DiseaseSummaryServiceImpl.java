package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.DiseaseActivityReport;
import org.openmrs.module.labtestreport.DiseaseActivityRow;
import org.openmrs.module.labtestreport.DiseaseActivityRow.Kind;
import org.openmrs.module.labtestreport.DiseaseSummaryRow;
import org.openmrs.module.labtestreport.DiseaseSummaryService;
import org.openmrs.module.labtestreport.PatientRow;
import org.openmrs.module.labtestreport.db.DiseaseSummaryDAO;
import org.openmrs.module.labtestreport.impl.DiseaseActivityLayout.RowDefinition;

public class DiseaseSummaryServiceImpl extends BaseOpenmrsService implements DiseaseSummaryService {

	private static final String[] AGE_GROUPS = { "0-4", "5-14", "15-18", "19-49", "50-65", "65+" };

	private static final String[] GENDERS = { "M", "F" };

	private DiseaseSummaryDAO dao;

	/**
	 * Built on first use and kept for the life of the module: the mapping sheet ships inside the module
	 * and diagnosis concepts are rarely renamed, so a module restart picks up either change.
	 */
	private volatile DiseaseActivityMapping activityMapping;

	public void setDao(DiseaseSummaryDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<DiseaseSummaryRow> getSummaryReport(Date startDate, Date endDate, String locationUuid) {
		List<DiseaseSummaryRow> rows = new ArrayList<>();
		for (Object[] r : dao.getSummaryRows(startDate, endDate, locationUuid)) {
			DiseaseSummaryRow row = new DiseaseSummaryRow();
			row.setCategoryConceptId(toInteger(r[0]));
			row.setCategory((String) r[1]);
			row.setDiagnosisConceptId(toInteger(r[2]));
			row.setDiagnosisLabel((String) r[3]);
			row.setTotalCases(toLong(r[4]));
			row.getCounts().put("0-4_M", toLong(r[5]));
			row.getCounts().put("0-4_F", toLong(r[6]));
			row.getCounts().put("5-14_M", toLong(r[7]));
			row.getCounts().put("5-14_F", toLong(r[8]));
			row.getCounts().put("15-18_M", toLong(r[9]));
			row.getCounts().put("15-18_F", toLong(r[10]));
			row.getCounts().put("19-49_M", toLong(r[11]));
			row.getCounts().put("19-49_F", toLong(r[12]));
			row.getCounts().put("50-65_M", toLong(r[13]));
			row.getCounts().put("50-65_F", toLong(r[14]));
			row.getCounts().put("65+_M", toLong(r[15]));
			row.getCounts().put("65+_F", toLong(r[16]));
			row.setTotal(toLong(r[17]));
			rows.add(row);
		}
		return rows;
	}

	@Override
	public List<DiseaseSummaryRow> getEwarsReport(Date startDate, Date endDate, String locationUuid) {
		String[] keys = { "0-4_M", "0-4_F", "5-14_M", "5-14_F", "15-18_M", "15-18_F", "19-49_M", "19-49_F", "50-65_M",
		        "50-65_F", "65+_M", "65+_F" };
		List<DiseaseSummaryRow> rows = new ArrayList<>();
		for (Object[] r : dao.getEwarsRows(startDate, endDate, locationUuid)) {
			DiseaseSummaryRow row = new DiseaseSummaryRow();
			row.setDiagnosisLabel((String) r[0]);
			for (int i = 0; i < keys.length; i++) {
				row.getCounts().put(keys[i], toLong(r[i + 1]));
			}
			row.setTotal(toLong(r[13]));
			rows.add(row);
		}
		return rows;
	}

	@Override
	public List<PatientRow> getPatientsForCell(Integer diagnosisConceptId, String gender, String ageGroup,
	        Date startDate, Date endDate, String locationUuid) {
		return toPatientRows(dao.getPatientsForDiagnosisCell(diagnosisConceptId, gender, ageGroup, startDate, endDate,
		    locationUuid));
	}

	@Override
	public List<PatientRow> getPatientsForEwarsCell(String diagnosisLabel, String gender, String ageGroup,
	        Date startDate, Date endDate, String locationUuid) {
		return toPatientRows(dao.getPatientsForEwarsCell(diagnosisLabel, gender, ageGroup, startDate, endDate,
		    locationUuid));
	}

	@Override
	public DiseaseActivityReport getActivityReport(Date startDate, Date endDate, String locationUuid) {
		DiseaseActivityMapping mapping = getActivityMapping();
		Map<String, DiseaseActivityRow> rowsByKey = new LinkedHashMap<>();
		for (RowDefinition definition : DiseaseActivityLayout.ROWS) {
			DiseaseActivityRow row = new DiseaseActivityRow();
			row.setGroup(definition.group);
			row.setSection(definition.section);
			row.setRowKey(definition.key);
			row.setNumber(definition.number);
			row.setLabel(definition.label);
			row.setKind(definition.kind);
			row.getDiagnoses().addAll(mapping.getDiagnosisNames(definition.key));
			for (String ageGroup : AGE_GROUPS) {
				for (String gender : GENDERS) {
					row.getCounts().put(cellKey(ageGroup, gender), 0L);
				}
			}
			rowsByKey.put(definition.key, row);
		}

		for (ActivityEvent event : getActivityEvents(mapping, startDate, endDate, locationUuid)) {
			DiseaseActivityRow row = rowsByKey.get(event.rowKey);
			// Patients recorded with a gender other than M/F still count towards the row total, the
			// same as the EWARS report, even though there's no column to show them in.
			row.setTotal(row.getTotal() + 1);
			row.getCounts().computeIfPresent(cellKey(event.ageGroup, event.gender), (key, count) -> count + 1);
		}

		// Subtotal and total rows only ever add up rows defined above them, so one pass in order works.
		for (RowDefinition definition : DiseaseActivityLayout.ROWS) {
			if (definition.kind != Kind.SUBTOTAL && definition.kind != Kind.TOTAL) {
				continue;
			}
			DiseaseActivityRow row = rowsByKey.get(definition.key);
			for (String memberKey : definition.memberKeys) {
				DiseaseActivityRow member = rowsByKey.get(memberKey);
				row.setTotal(row.getTotal() + member.getTotal());
				member.getCounts().forEach((key, count) -> row.getCounts().merge(key, count, Long::sum));
				if (definition.kind == Kind.SUBTOTAL) {
					row.getDiagnoses().addAll(member.getDiagnoses());
				}
			}
			row.getDiagnoses().sort(String.CASE_INSENSITIVE_ORDER);
		}

		DiseaseActivityReport report = new DiseaseActivityReport();
		report.getRows().addAll(rowsByKey.values());
		return report;
	}

	@Override
	public List<PatientRow> getPatientsForActivityRow(String rowKey, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid) {
		Set<String> rowKeys = new HashSet<>();
		collectDiagnosisRowKeys(rowKey, rowKeys);
		Set<Integer> patientIds = new LinkedHashSet<>();
		for (ActivityEvent event : getActivityEvents(getActivityMapping(), startDate, endDate, locationUuid)) {
			if (rowKeys.contains(event.rowKey) && (ageGroup == null || ageGroup.equals(event.ageGroup))
			        && (gender == null || gender.equals(event.gender))) {
				patientIds.add(event.patientId);
			}
		}
		if (patientIds.isEmpty()) {
			return new ArrayList<>();
		}
		return toPatientRows(dao.getPatients(patientIds));
	}

	/** Expands a subtotal/total row key into the diagnosis rows it ultimately adds up. */
	private static void collectDiagnosisRowKeys(String rowKey, Set<String> into) {
		for (RowDefinition definition : DiseaseActivityLayout.ROWS) {
			if (definition.key.equals(rowKey)) {
				if (definition.kind == Kind.DIAGNOSIS) {
					into.add(rowKey);
				}
				for (String memberKey : definition.memberKeys) {
					collectDiagnosisRowKeys(memberKey, into);
				}
				return;
			}
		}
	}

	/**
	 * The diagnoses recorded within the filters, each mapped to its report row and collapsed so a
	 * patient counts once per row per day (two diagnoses from the same row at one visit, or a diagnosis
	 * also recorded as a condition, are one case).
	 */
	private List<ActivityEvent> getActivityEvents(DiseaseActivityMapping mapping, Date startDate, Date endDate,
	        String locationUuid) {
		List<ActivityEvent> events = new ArrayList<>();
		Map<Integer, String> rowKeyByConceptId = mapping.getRowKeyByConceptId();
		if (rowKeyByConceptId.isEmpty()) {
			return events;
		}
		Set<String> seen = new HashSet<>();
		for (Object[] r : dao.getActivityEvents(rowKeyByConceptId.keySet(), startDate, endDate, locationUuid)) {
			String rowKey = rowKeyByConceptId.get(toInteger(r[0]));
			Integer patientId = toInteger(r[1]);
			if (rowKey != null && seen.add(rowKey + "|" + patientId + "|" + r[2])) {
				events.add(new ActivityEvent(rowKey, patientId, (String) r[3], (String) r[4]));
			}
		}
		return events;
	}

	private DiseaseActivityMapping getActivityMapping() {
		DiseaseActivityMapping mapping = activityMapping;
		if (mapping == null) {
			synchronized (this) {
				mapping = activityMapping;
				if (mapping == null) {
					mapping = DiseaseActivityMapping.build(this::resolveConceptNames);
					activityMapping = mapping;
				}
			}
		}
		return mapping;
	}

	/**
	 * Picks one concept per name: an English fully-specified name beats any other English name, which
	 * beats a name in another locale; ties go to the oldest concept.
	 */
	private Map<String, Integer> resolveConceptNames(Set<String> normalizedNames) {
		Map<String, Integer> conceptIdByName = new HashMap<>();
		Map<String, Integer> rankByName = new HashMap<>();
		for (Object[] r : dao.resolveConceptNames(normalizedNames)) {
			String name = (String) r[0];
			Integer conceptId = toInteger(r[1]);
			String locale = (String) r[2];
			boolean english = locale != null && locale.startsWith("en");
			int rank = english ? ("FULLY_SPECIFIED".equals(r[3]) ? 0 : 1) : 2;
			Integer bestRank = rankByName.get(name);
			if (bestRank == null || rank < bestRank || (rank == bestRank && conceptId < conceptIdByName.get(name))) {
				rankByName.put(name, rank);
				conceptIdByName.put(name, conceptId);
			}
		}
		return conceptIdByName;
	}

	private static String cellKey(String ageGroup, String gender) {
		return ageGroup + "_" + gender;
	}

	private static List<PatientRow> toPatientRows(List<Object[]> results) {
		List<PatientRow> rows = new ArrayList<>();
		for (Object[] r : results) {
			PatientRow row = new PatientRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setFamilyName((String) r[3]);
			row.setIdentifier((String) r[4]);
			row.setSex((String) r[5]);
			row.setNationalId((String) r[6]);
			row.setPhoneNumber((String) r[7]);
			rows.add(row);
		}
		return rows;
	}

	private static Integer toInteger(Object value) {
		return value == null ? null : ((Number) value).intValue();
	}

	private static long toLong(Object value) {
		return value == null ? 0L : ((Number) value).longValue();
	}

	private static final class ActivityEvent {

		private final String rowKey;

		private final Integer patientId;

		private final String ageGroup;

		private final String gender;

		private ActivityEvent(String rowKey, Integer patientId, String ageGroup, String gender) {
			this.rowKey = rowKey;
			this.patientId = patientId;
			this.ageGroup = ageGroup;
			this.gender = gender;
		}
	}
}
