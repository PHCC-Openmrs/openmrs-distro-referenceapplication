package org.openmrs.module.labtestreport.report;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.module.labtestreport.db.SqlResources;
import org.openmrs.module.reporting.dataset.definition.SqlDataSetDefinition;
import org.openmrs.module.reporting.evaluation.parameter.Mapped;
import org.openmrs.module.reporting.evaluation.parameter.Parameter;
import org.openmrs.module.reporting.report.ReportDesign;
import org.openmrs.module.reporting.report.definition.ReportDefinition;
import org.openmrs.module.reporting.report.manager.BaseReportManager;

/**
 * Registers the stock inventory ledger report with the Reporting module so it also shows up in
 * the O3 Reports dashboard (as a plain data table; the item x day pivot is only rendered on the
 * interactive admin page and O3 report page).
 */
public class StockLedgerReportManager extends BaseReportManager {

	public static final String UUID = "5e9c2a41-7f83-4b6e-9d1a-3c8f6e2b0a94";

	@Override
	public String getUuid() {
		return UUID;
	}

	@Override
	public String getName() {
		return "Stock Inventory Ledger Report";
	}

	@Override
	public String getDescription() {
		return "Daily opening balance, outgoing and balance on stock per item, location and batch. "
		        + "For the interactive pivot table, use the report under Administration instead.";
	}

	@Override
	public List<Parameter> getParameters() {
		List<Parameter> parameters = new ArrayList<>();
		parameters.add(new Parameter("startDate", "Start Date", Date.class, null, null, null, false));
		parameters.add(new Parameter("endDate", "End Date", Date.class, null, null, null, false));
		return parameters;
	}

	@Override
	public ReportDefinition constructReportDefinition() {
		ReportDefinition reportDefinition = new ReportDefinition();
		reportDefinition.setUuid(getUuid());
		reportDefinition.setName(getName());
		reportDefinition.setDescription(getDescription());
		for (Parameter parameter : getParameters()) {
			reportDefinition.addParameter(parameter);
		}

		SqlDataSetDefinition dataSetDefinition = new SqlDataSetDefinition();
		dataSetDefinition.setName(getName());
		dataSetDefinition.setDescription(getDescription());
		dataSetDefinition.setSqlQuery(buildPreviewSql());
		for (Parameter parameter : getParameters()) {
			dataSetDefinition.addParameter(parameter);
		}

		reportDefinition.addDataSetDefinition("stockLedger", Mapped.mapStraightThrough(dataSetDefinition));

		return reportDefinition;
	}

	@Override
	public List<ReportDesign> constructReportDesigns(ReportDefinition reportDefinition) {
		return new ArrayList<>();
	}

	@Override
	public String getVersion() {
		return "1.0.0-SNAPSHOT";
	}

	private static String buildPreviewSql() {
		// stock_ledger_report.sql also filters by :locationUuid, but this registered report declares
		// only startDate/endDate. Reporting's SqlQueryBuilder substitutes exactly the parameters it
		// was handed, so any other :name survives into the JDBC statement as literal text and fails
		// at prepare time. Pin it to NULL, which the query reads as "all locations" - declaring a
		// parameter instead would only surface a raw-UUID text box in the reporting UI.
		String allLocations = SqlResources.load("stock_ledger_report.sql").replace(":locationUuid", "NULL");
		// The same three quantities the interactive report shows, and for the same reason:
		// Opening Balance - Outgoing = Balance on Stock. Opening Balance is remainingQty +
		// outgoingQty, matching StockLedgerServiceImpl - see the derivation there before changing
		// it, since the plausible-looking alternative drops the day's arrivals.
		// Bulk Unit / Units per Bulk carry the item's procurement pack alongside the dispensing unit,
		// so a reader can convert any of the three quantities into whole packs - 2,760 Tablet at 30
		// to a Box is 92 Box, which is how the O3 stock reports render it. Carried as two columns
		// rather than as pre-divided pack figures so the quantities above stay numeric and summable
		// in the exported spreadsheet.
		return "SELECT itemName AS `Item`, locationName AS `Location`, batchNo AS `Batch No`, "
		        + "ledgerDate AS `Date`, (remainingQty + outgoingQty) AS `Opening Balance`, "
		        + "outgoingQty AS `Outgoing`, remainingQty AS `Balance on Stock`, unitName AS `Unit`, "
		        + "bulkUnitName AS `Bulk Unit`, bulkFactor AS `Units per Bulk` "
		        + "FROM (" + allLocations + ") base";
	}
}
