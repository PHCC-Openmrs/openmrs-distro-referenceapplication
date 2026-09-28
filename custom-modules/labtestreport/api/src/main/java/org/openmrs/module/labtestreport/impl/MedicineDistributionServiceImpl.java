package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.MedicineDistributionRow;
import org.openmrs.module.labtestreport.MedicineDistributionService;
import org.openmrs.module.labtestreport.db.MedicineDistributionDAO;

public class MedicineDistributionServiceImpl extends BaseOpenmrsService implements MedicineDistributionService {

	private MedicineDistributionDAO dao;

	public void setDao(MedicineDistributionDAO dao) {
		this.dao = dao;
	}

	@Override
	public List<MedicineDistributionRow> getMedicineDistributionReport(Date startDate, Date endDate,
	        String locationUuid) {
		List<MedicineDistributionRow> rows = new ArrayList<>();
		for (Object[] r : dao.getMedicineDistributionReport(startDate, endDate, locationUuid)) {
			MedicineDistributionRow row = new MedicineDistributionRow();
			row.setPatientId(toInteger(r[0]));
			row.setPatientUuid((String) r[1]);
			row.setGivenName((String) r[2]);
			row.setMiddleName((String) r[3]);
			row.setFamilyName((String) r[4]);
			row.setOrderId(toInteger(r[5]));
			row.setDateActivated((Date) r[6]);
			row.setLocation((String) r[7]);
			row.setAge(toInteger(r[8]));
			row.setGender((String) r[9]);
			row.setNationalId((String) r[10]);
			row.setDrugId(toInteger(r[11]));
			row.setDrugName((String) r[12]);
			row.setDose(toDouble(r[13]));
			row.setDoseUnits((String) r[14]);
			row.setFrequency((String) r[15]);
			row.setRoute((String) r[16]);
			row.setDuration(toInteger(r[17]));
			row.setDurationUnits((String) r[18]);
			row.setQuantityPrescribed(toDouble(r[19]));
			row.setQuantityUnits((String) r[20]);
			row.setAsNeeded(toBoolean(r[21]));
			row.setDosingInstructions((String) r[22]);
			row.setQuantityDispensed(toDouble(r[23]));
			row.setDispenseStatus((String) r[24]);
			row.setPrescriber((String) r[25]);
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

	/** drug_order.as_needed is a BIT/TINYINT, which the driver may hand back as a Boolean or as a Number. */
	private static Boolean toBoolean(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Boolean) {
			return (Boolean) value;
		}
		return ((Number) value).intValue() != 0;
	}
}
