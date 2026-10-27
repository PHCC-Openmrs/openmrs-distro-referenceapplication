package org.openmrs.module.labtestreport.impl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.labtestreport.PatientNameSearchService;
import org.openmrs.module.labtestreport.db.PatientNameSearchDAO;
import org.springframework.transaction.annotation.Transactional;

public class PatientNameSearchServiceImpl extends BaseOpenmrsService implements PatientNameSearchService {

	private PatientNameSearchDAO dao;

	public void setDao(PatientNameSearchDAO dao) {
		this.dao = dao;
	}

	@Override
	@Transactional(readOnly = true)
	public List<String> getPatientUuidsByNameWords(List<String> words) {
		List<String> cleaned = words == null ? Collections.emptyList()
		        : words.stream().filter(StringUtils::isNotBlank).map(String::trim).collect(Collectors.toList());
		if (cleaned.isEmpty()) {
			return Collections.emptyList();
		}
		return dao.getPatientUuidsByNameWords(cleaned);
	}
}
