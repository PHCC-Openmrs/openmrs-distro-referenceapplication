package org.openmrs.module.labtestreport.db.hibernate;

import org.hibernate.SQLQuery;
import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.NationalIdDAO;

public class HibernateNationalIdDAO implements NationalIdDAO {

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	public boolean isNationalIdInUse(String nationalId, String excludePatientUuid) throws DAOException {
		// identifier_type + identifier lead labtestreport_national_id_idx, so this is a single index seek
		String sql = "select 1 from patient_identifier pi"
		        + " join patient_identifier_type pit on pit.patient_identifier_type_id = pi.identifier_type"
		        + " join patient pa on pa.patient_id = pi.patient_id"
		        + " join person p on p.person_id = pi.patient_id"
		        + " where pit.name = 'National ID' and pi.identifier = :nationalId"
		        + " and pi.voided = 0 and pa.voided = 0"
		        + (excludePatientUuid != null ? " and p.uuid <> :excludePatientUuid" : "")
		        + " limit 1";
		SQLQuery query = sessionFactory.getCurrentSession().createSQLQuery(sql);
		query.setParameter("nationalId", nationalId);
		if (excludePatientUuid != null) {
			query.setParameter("excludePatientUuid", excludePatientUuid);
		}
		return query.uniqueResult() != null;
	}
}
