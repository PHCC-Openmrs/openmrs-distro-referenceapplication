package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.NcdPatientCardReportService;
import org.openmrs.module.labtestreport.NcdPatientCardRow;
import org.openmrs.module.labtestreport.db.NcdPatientCardReportDAO;

public class NcdPatientCardReportServiceImpl extends BaseOpenmrsService implements NcdPatientCardReportService {

	private NcdPatientCardReportDAO dao;

	public void setDao(NcdPatientCardReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<NcdPatientCardRow> getNcdPatientCardReport(Date startDate, Date endDate) {
		List<NcdPatientCardRow> rows = new ArrayList<>();
		for (Object[] r : dao.getNcdPatientCardReport(startDate, endDate)) {
			NcdPatientCardRow row = new NcdPatientCardRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setFamilyName((String) r[3]);
			row.setEncounterId(toInteger(r[4]));
			row.setEncounterDatetime((Date) r[5]);
			row.setLocation((String) r[6]);
			row.setFullName((String) r[7]);
			row.setNationalId((String) r[8]);
			row.setDob((Date) r[9]);
			row.setGender((String) r[10]);
			row.setPhoneNumber((String) r[11]);
			row.setAddress((String) r[12]);
			row.setCondition((String) r[13]);
			row.setConditionStart((Date) r[14]);
			row.setStatus((String) r[15]);
			row.setFollowDate((Date) r[16]);
			row.setBp((String) r[17]);
			row.setGlucose(toDouble(r[18]));
			row.setMedication((String) r[19]);
			row.setNextFollow((Date) r[20]);
			rows.add(row);
		}
		return rows;
	}

	private static Integer toInteger(Object value) {
		return value == null ? null : ((Number) value).intValue();
	}

	private static Double toDouble(Object value) {
		return value == null ? null : ((Number) value).doubleValue();
	}
}
