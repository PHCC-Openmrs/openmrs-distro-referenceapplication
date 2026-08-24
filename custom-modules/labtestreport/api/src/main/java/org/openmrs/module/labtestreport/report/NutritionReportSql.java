package org.openmrs.module.labtestreport.report;

import org.openmrs.module.labtestreport.db.SqlResources;

/**
 * Builds the O3 Reports dashboard preview SQL shared by {@link ChildUnder5ReportManager} and
 * {@link ChildAbove5ReportManager}: the same query the interactive admin page uses, with the
 * :underFive placeholder resolved to a literal age filter (the dashboard preview only binds the
 * declared Start Date / End Date parameters, not this age band), and display-friendly column
 * headers.
 */
class NutritionReportSql {

	private static final String HAVING_PLACEHOLDER = "HAVING (:underFive = TRUE AND age < 5) OR (:underFive = FALSE AND age >= 5)";

	private NutritionReportSql() {
	}

	static String buildPreviewSql(boolean underFive) {
		String baseSql = SqlResources.load("nutrition_summary_report.sql");
		String ageFilter = underFive ? "HAVING age < 5" : "HAVING age >= 5";
		if (!baseSql.contains(HAVING_PLACEHOLDER)) {
			throw new IllegalStateException("nutrition_summary_report.sql no longer matches the expected HAVING clause");
		}
		String resolvedSql = baseSql.replace(HAVING_PLACEHOLDER, ageFilter);

		return "SELECT givenName AS `Given Name`, familyName AS `Family Name`, category AS `Category`, "
		        + "age AS `Age`, location AS `Location`, visitDate AS `Visit Date`, "
		        + "visitCount AS `Number of Visits`, currentMuac AS `Current MUAC`, lastMuac AS `Last MUAC`, "
		        + "diagnosis AS `Diagnosis`, typeOfSupplement AS `Type of Supplement`, "
		        + "supplementQuantity AS `Supplement Quantity`, nationalId AS `National ID`, "
		        + "phoneNumber AS `Phone Number`, project AS `Project` "
		        + "FROM (" + resolvedSql + ") base";
	}
}
