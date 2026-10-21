package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface DiseaseSummaryService extends OpenmrsService {

	/**
	 * @param startDate only include diagnoses on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include diagnoses through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include diagnoses recorded at this location (a condition counts at the location of
	 *            the visit open when it was recorded), or null for all locations
	 * @return the full disease surveillance summary report: one row per category/diagnosis combination
	 */
	List<DiseaseSummaryRow> getSummaryReport(Date startDate, Date endDate, String locationUuid);

	/**
	 * @param startDate only include diagnoses on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include diagnoses through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include diagnoses recorded at this location (a condition counts at the location of
	 *            the visit open when it was recorded), or null for all locations
	 * @return the EWARS weekly report: one row per fixed EWARS diagnosis (in report order), with no category
	 */
	List<DiseaseSummaryRow> getEwarsReport(Date startDate, Date endDate, String locationUuid);

	/**
	 * Drills down into a single summary report cell to list the patients behind its count.
	 *
	 * @param diagnosisConceptId concept id of the diagnosis to match
	 * @param gender "M" or "F", or null to match any gender (e.g. drilling down from a total column)
	 * @param ageGroup one of "0-4", "5-14", "15-18", "19-49", "50-65", "65+", or null to match any age
	 * @param startDate only include diagnoses on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include diagnoses through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include diagnoses recorded at this location (a condition counts at the location of
	 *            the visit open when it was recorded), or null for all locations
	 */
	List<PatientRow> getPatientsForCell(Integer diagnosisConceptId, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid);

	/** Patients behind an EWARS report cell, identified by the row's diagnosis label. */
	List<PatientRow> getPatientsForEwarsCell(String diagnosisLabel, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid);

	/**
	 * The disease surveillance summary report in the Primary Health Activity layout: fixed, numbered
	 * report rows in paper-template order, each rolling up the diagnoses mapped to it in
	 * disease_summary_diagnosis_map.csv, plus subtotal/total rows and the template rows nothing records
	 * yet. A patient counts at most once per row per day.
	 *
	 * @param startDate only include diagnoses on/after this date (inclusive), or null for no lower bound
	 * @param endDate only include diagnoses through the end of this date (inclusive), or null for no upper bound
	 * @param locationUuid only include diagnoses recorded at this location (a condition counts at the location of
	 *            the visit open when it was recorded), or null for all locations
	 */
	DiseaseActivityReport getActivityReport(Date startDate, Date endDate, String locationUuid);

	/**
	 * Patients behind a cell of {@link #getActivityReport}.
	 *
	 * @param rowKey the row's key; a subtotal or total row covers every row it adds up
	 * @param gender "M" or "F", or null to match any gender
	 * @param ageGroup one of "0-4", "5-14", "15-18", "19-49", "50-65", "65+", or null to match any age
	 */
	List<PatientRow> getPatientsForActivityRow(String rowKey, String gender, String ageGroup, Date startDate,
	        Date endDate, String locationUuid);
}
