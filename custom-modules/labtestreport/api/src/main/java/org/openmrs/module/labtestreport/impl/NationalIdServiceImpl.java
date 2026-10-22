package org.openmrs.module.labtestreport.impl;

import org.apache.commons.lang3.StringUtils;
import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.NationalIdService;
import org.openmrs.module.labtestreport.db.NationalIdDAO;
import org.springframework.transaction.annotation.Transactional;

public class NationalIdServiceImpl extends BaseOpenmrsService implements NationalIdService {

	private NationalIdDAO dao;

	public void setDao(NationalIdDAO dao) {
		this.dao = dao;
	}

	@Override
	@Transactional(readOnly = true)
	public boolean isNationalIdInUse(String nationalId, String excludePatientUuid) {
		if (StringUtils.isBlank(nationalId)) {
			return false;
		}
		return dao.isNationalIdInUse(nationalId.trim(), StringUtils.trimToNull(excludePatientUuid));
	}
}
