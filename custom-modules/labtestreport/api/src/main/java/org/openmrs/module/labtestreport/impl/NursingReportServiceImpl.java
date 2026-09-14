package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.NursingReportRow;
import org.openmrs.module.labtestreport.NursingReportService;
import org.openmrs.module.labtestreport.db.NursingReportDAO;

public class NursingReportServiceImpl extends BaseOpenmrsService implements NursingReportService {

	private NursingReportDAO dao;

	public void setDao(NursingReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<NursingReportRow> getNursingReport(Date startDate, Date endDate, String locationUuid) {
		List<NursingReportRow> rows = new ArrayList<>();
		for (Object[] r : dao.getNursingReport(startDate, endDate, locationUuid)) {
			NursingReportRow row = new NursingReportRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setMiddleName((String) r[3]);
			row.setFamilyName((String) r[4]);
			row.setEncounterId(toInteger(r[5]));
			row.setEncounterDatetime((Date) r[6]);
			row.setLocation((String) r[7]);
			row.setAge(toInteger(r[8]));
			row.setGender((String) r[9]);
			row.setTypeOfWound((String) r[10]);
			row.setOintments((String) r[11]);
			row.setDressingGeneralNotes((String) r[12]);
			row.setSpirometry(toDouble(r[13]));
			row.setMonofilament(toDouble(r[14]));
			row.setImInjection((String) r[15]);
			row.setIvInjection((String) r[16]);
			row.setOral((String) r[17]);
			row.setNebulization((String) r[18]);
			row.setEcgAttachmentUuid((String) r[19]);
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
