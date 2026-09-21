package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.HealthPromotionReportService;
import org.openmrs.module.labtestreport.HealthPromotionRow;
import org.openmrs.module.labtestreport.db.HealthPromotionReportDAO;

public class HealthPromotionReportServiceImpl extends BaseOpenmrsService implements HealthPromotionReportService {

	private HealthPromotionReportDAO dao;

	public void setDao(HealthPromotionReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<HealthPromotionRow> getHealthPromotionReport(Date startDate, Date endDate, String locationUuid) {
		List<HealthPromotionRow> rows = new ArrayList<>();
		for (Object[] r : dao.getHealthPromotionReport(startDate, endDate, locationUuid)) {
			HealthPromotionRow row = new HealthPromotionRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setMiddleName((String) r[3]);
			row.setFamilyName((String) r[4]);
			row.setEncounterId(toInteger(r[5]));
			row.setEncounterDatetime((Date) r[6]);
			row.setLocation((String) r[7]);
			row.setParticipantName((String) r[8]);
			row.setAge(toDouble(r[9]));
			row.setGender((String) r[10]);
			row.setNationalId((String) r[11]);
			row.setPhoneNumber((String) r[12]);
			row.setSessionDate((Date) r[13]);
			row.setSessionType((String) r[14]);
			row.setTopic((String) r[15]);
			row.setSessionLocation((String) r[16]);
			row.setChwName((String) r[17]);
			row.setNotes((String) r[18]);
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
