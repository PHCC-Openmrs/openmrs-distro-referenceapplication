package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.List;

import org.openmrs.api.OpenmrsService;

public interface NutritionReportService extends OpenmrsService {

	/**
	 * @param startDate only consider Nutrition Registration CU5 / Nutrition WFP PBW encounters on/after this
	 *            date (inclusive), or null for no lower bound
	 * @param endDate only consider those encounters through the end of this date (inclusive), or null for no
	 *            upper bound
	 * @param underFive true for the Child Under 5 report (current age &lt; 5), false for the Child Above 5
	 *            report (current age &gt;= 5)
	 * @return one row per beneficiary in that age band, with their most recent visit's data, Current MUAC
	 *         (this visit) and Last MUAC (the visit before it)
	 */
	List<NutritionSummaryRow> getSummaryReport(Date startDate, Date endDate, boolean underFive);

	/**
	 * @return the dropdown option lists (sites, categories, diagnoses, supplement types) for the Nutrition
	 *         report filters, sourced from the concept dictionary and from what has actually been recorded
	 */
	NutritionFilterOptions getFilterOptions();
}
