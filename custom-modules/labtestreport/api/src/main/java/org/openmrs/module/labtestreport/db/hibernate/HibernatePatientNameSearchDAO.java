package org.openmrs.module.labtestreport.db.hibernate;

import java.util.List;
import java.util.stream.Collectors;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.PatientNameSearchDAO;

public class HibernatePatientNameSearchDAO implements PatientNameSearchDAO {

	private static final String REGEX_SPECIAL_CHARACTERS = "\\.^$|?*+()[]{}";

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<String> getPatientUuidsByNameWords(List<String> words) throws DAOException {
		// the given_name prefix narrows the rows on person_name's given_name index before the regexp,
		// which then checks every word against the name word at the same position, e.g. "kumar sharma"
		// becomes ^ *kumar[^ ]* +sharma (middle and family names can themselves hold several words)
		String pattern = "^ *" + words.stream().map(HibernatePatientNameSearchDAO::escapeRegex)
		        .collect(Collectors.joining("[^ ]* +"));
		String sql = "select distinct p.uuid from person_name pn"
		        + " join patient pa on pa.patient_id = pn.person_id"
		        + " join person p on p.person_id = pn.person_id"
		        + " where pn.voided = 0 and pa.voided = 0"
		        + " and pn.given_name like :firstWordPrefix"
		        + " and concat_ws(' ', pn.given_name, pn.middle_name, pn.family_name) regexp :pattern";
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(sql);
		query.setParameter("firstWordPrefix", words.get(0) + "%");
		query.setParameter("pattern", pattern);
		return query.list();
	}

	private static String escapeRegex(String word) {
		StringBuilder escaped = new StringBuilder();
		for (char c : word.toCharArray()) {
			if (REGEX_SPECIAL_CHARACTERS.indexOf(c) >= 0) {
				escaped.append('\\');
			}
			escaped.append(c);
		}
		return escaped.toString();
	}
}
