package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.NutritionFilterOptions;
import org.openmrs.module.labtestreport.NutritionReportService;
import org.openmrs.module.labtestreport.NutritionSummaryRow;
import org.openmrs.module.labtestreport.db.NutritionReportDAO;

public class NutritionReportServiceImpl extends BaseOpenmrsService implements NutritionReportService {

	private NutritionReportDAO dao;

	public void setDao(NutritionReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<NutritionSummaryRow> getSummaryReport(Date startDate, Date endDate, boolean underFive) {
		List<NutritionSummaryRow> rows = new ArrayList<>();
		for (Object[] r : dao.getSummaryRows(startDate, endDate, underFive)) {
			NutritionSummaryRow row = new NutritionSummaryRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setFamilyName((String) r[3]);
			row.setCategory((String) r[4]);
			row.setAge(toInteger(r[5]));
			row.setLocation((String) r[6]);
			row.setVisitDate((java.util.Date) r[7]);
			row.setVisitCount(toLong(r[8]));
			row.setCurrentMuac(toDouble(r[9]));
			row.setLastMuac(toDouble(r[10]));
			row.setDiagnosis((String) r[11]);
			row.setTypeOfSupplement((String) r[12]);
			row.setSupplementQuantity(toDouble(r[13]));
			row.setNationalId((String) r[14]);
			row.setPhoneNumber((String) r[15]);
			row.setProject((String) r[16]);
			rows.add(row);
		}
		return rows;
	}

	@Override
	public NutritionFilterOptions getFilterOptions() {
		LinkedHashSet<String> locations = new LinkedHashSet<>();
		LinkedHashSet<String> categories = new LinkedHashSet<>();
		LinkedHashSet<String> diagnoses = new LinkedHashSet<>();
		LinkedHashSet<String> supplementTypes = new LinkedHashSet<>();
		for (Object[] r : dao.getFilterOptionRows()) {
			String filterType = (String) r[0];
			String optionValue = (String) r[1];
			if (optionValue == null) {
				continue;
			}
			switch (filterType) {
				case "location":
					locations.add(optionValue);
					break;
				case "category":
					categories.add(optionValue);
					break;
				case "diagnosis":
					diagnoses.add(optionValue);
					break;
				case "supplementType":
					supplementTypes.add(optionValue);
					break;
				default:
					break;
			}
		}
		NutritionFilterOptions options = new NutritionFilterOptions();
		options.setLocations(new ArrayList<>(locations));
		options.setCategories(new ArrayList<>(categories));
		options.setDiagnoses(new ArrayList<>(diagnoses));
		options.setSupplementTypes(new ArrayList<>(supplementTypes));
		return options;
	}

	private static Integer toInteger(Object value) {
		return value == null ? null : ((Number) value).intValue();
	}

	private static long toLong(Object value) {
		return value == null ? 0L : ((Number) value).longValue();
	}

	private static Double toDouble(Object value) {
		return value == null ? null : ((Number) value).doubleValue();
	}
}
