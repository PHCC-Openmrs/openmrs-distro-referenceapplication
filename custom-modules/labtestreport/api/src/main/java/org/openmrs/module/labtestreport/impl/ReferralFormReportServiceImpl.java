package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.ReferralFormReportService;
import org.openmrs.module.labtestreport.ReferralFormRow;
import org.openmrs.module.labtestreport.db.ReferralFormReportDAO;

public class ReferralFormReportServiceImpl extends BaseOpenmrsService implements ReferralFormReportService {

	private ReferralFormReportDAO dao;

	public void setDao(ReferralFormReportDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<ReferralFormRow> getReferralFormReport(Date startDate, Date endDate) {
		List<ReferralFormRow> rows = new ArrayList<>();
		for (Object[] r : dao.getReferralFormReport(startDate, endDate)) {
			ReferralFormRow row = new ReferralFormRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setFamilyName((String) r[3]);
			row.setEncounterId(toInteger(r[4]));
			row.setEncounterDatetime((Date) r[5]);
			row.setLocation((String) r[6]);
			row.setFullName((String) r[7]);
			row.setAge(toDouble(r[8]));
			row.setGender((String) r[9]);
			row.setReferralDate((Date) r[10]);
			row.setReferralTime((String) r[11]);
			row.setFormPatientId((String) r[12]);
			row.setPhoneNumber((String) r[13]);
			row.setReferringFacility((String) r[14]);
			row.setReferredTo((String) r[15]);
			row.setUrgency((String) r[16]);
			row.setTransportation((String) r[17]);
			row.setReferralCause((String) r[18]);
			row.setClinicalHistory((String) r[19]);
			row.setManagementReceived((String) r[20]);
			row.setReferringDoctor((String) r[21]);
			row.setHeadOfClinic((String) r[22]);
			row.setFeedback((String) r[23]);
			row.setFollowUp((String) r[24]);
			row.setTreatingDoctor((String) r[25]);
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
