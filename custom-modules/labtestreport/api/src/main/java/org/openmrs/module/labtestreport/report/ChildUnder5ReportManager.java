package org.openmrs.module.labtestreport.report;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.module.reporting.dataset.definition.SqlDataSetDefinition;
import org.openmrs.module.reporting.evaluation.parameter.Mapped;
import org.openmrs.module.reporting.evaluation.parameter.Parameter;
import org.openmrs.module.reporting.report.ReportDesign;
import org.openmrs.module.reporting.report.definition.ReportDefinition;
import org.openmrs.module.reporting.report.manager.BaseReportManager;

/**
 * Registers the Nutrition Report - Child Under 5 with the Reporting module so it also shows up in
 * the O3 Reports dashboard (as a plain table, without the admin page's clickable rows).
 */
public class ChildUnder5ReportManager extends BaseReportManager {

	public static final String UUID = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

	@Override
	public String getUuid() {
		return UUID;
	}

	@Override
	public String getName() {
		return "Nutrition Report - Child Under 5";
	}

	@Override
	public String getDescription() {
		return "Beneficiaries currently under 5, registered under the Nutrition Registration CU5 and/or "
		        + "Nutrition WFP PBW forms, with their most recent visit's Current MUAC next to the Last MUAC "
		        + "recorded at their previous visit. For clickable rows that jump to each beneficiary's chart, "
		        + "use the report under Administration instead.";
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
		dataSetDefinition.setSqlQuery(NutritionReportSql.buildPreviewSql(true));
		for (Parameter parameter : getParameters()) {
			dataSetDefinition.addParameter(parameter);
		}

		reportDefinition.addDataSetDefinition("nutritionChildUnder5", Mapped.mapStraightThrough(dataSetDefinition));

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
}
