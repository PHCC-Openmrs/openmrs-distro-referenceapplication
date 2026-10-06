package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.SrhReportRow;
import org.openmrs.module.labtestreport.SrhReportService;
import org.openmrs.module.labtestreport.db.SrhReportDAO;

public class SrhReportServiceImpl extends BaseOpenmrsService implements SrhReportService {

	private SrhReportDAO dao;

	public void setDao(SrhReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<SrhReportRow> getSrhReport(Date startDate, Date endDate, String locationUuid, String section) {
		List<SrhReportRow> rows = new ArrayList<>();
		for (Object[] r : dao.getSrhReport(startDate, endDate, locationUuid, section)) {
			SrhReportRow row = new SrhReportRow();
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
			row.setNationalId((String) r[10]);
			row.setPhoneNumber((String) r[11]);
			row.setSection((String) r[12]);
			row.setFetuses((String) r[13]);
			row.setFetalHeartPulsation((String) r[14]);
			row.setPresentation((String) r[15]);
			row.setLieFetuses((String) r[16]);
			row.setFetalGender((String) r[17]);
			row.setFemurLength(toDouble(r[18]));
			row.setCrownRumpLength(toDouble(r[19]));
			row.setBiparietalDiameter(toDouble(r[20]));
			row.setAbdominalCircumference(toDouble(r[21]));
			row.setGestationalAgeWeeks(toDouble(r[22]));
			row.setGestationalAgeDays(toDouble(r[23]));
			row.setPlacenta((String) r[24]);
			row.setAmnioticFluid((String) r[25]);
			row.setExpectedDateOfDelivery((Date) r[26]);
			row.setWeeksSinceLmp(toDouble(r[27]));
			row.setReferrals((String) r[28]);
			row.setUltrasoundNotes((String) r[29]);
			row.setPncTiming((String) r[30]);
			row.setSti((String) r[31]);
			row.setGynaecology((String) r[32]);
			row.setPreConceptionCare((String) r[33]);
			row.setStiGynaecologyNotes((String) r[34]);
			row.setFamilyPlanningVisitType((String) r[35]);
			row.setContraceptionKind((String) r[36]);
			row.setFamilyPlanningNotes((String) r[37]);
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
