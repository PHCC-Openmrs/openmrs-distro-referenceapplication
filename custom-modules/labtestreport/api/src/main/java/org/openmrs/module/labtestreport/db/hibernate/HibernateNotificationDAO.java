package org.openmrs.module.labtestreport.db.hibernate;

import java.util.List;

import org.openmrs.api.db.DAOException;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.labtestreport.db.NotificationDAO;
import org.openmrs.notification.Alert;

public class HibernateNotificationDAO implements NotificationDAO {

	private DbSessionFactory sessionFactory;

	public void setSessionFactory(DbSessionFactory sessionFactory) {
		this.sessionFactory = sessionFactory;
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Alert> getAlertsContaining(String marker) throws DAOException {
		return sessionFactory.getCurrentSession()
		        .createQuery("from Alert a where a.text like :marker order by a.alertId desc")
		        .setParameter("marker", "%" + marker + "%").list();
	}

	@Override
	public Object[] getActiveQueueEntry(String queueEntryUuid) throws DAOException {
		return (Object[]) sessionFactory.getCurrentSession()
		        .createSQLQuery("select p.uuid as patient_uuid, q.name as queue_name, q.location_id, pr.person_id, qe.creator,"
		                + " cf.name as coming_from_name"
		                + " from queue_entry qe"
		                + " join queue q on q.queue_id = qe.queue_id"
		                + " join person p on p.person_id = qe.patient_id"
		                + " left join provider pr on pr.provider_id = qe.provider_waiting_for"
		                + " left join queue cf on cf.queue_id = qe.queue_coming_from"
		                + " where qe.uuid = :uuid and qe.voided = 0 and qe.ended_at is null")
		        .setParameter("uuid", queueEntryUuid).uniqueResult();
	}

	@Override
	public Object[] getStockOperation(String stockOperationUuid) throws DAOException {
		return (Object[]) sessionFactory.getCurrentSession()
		        .createSQLQuery("select so.status, so.operation_number, t.name as operation_type_name, so.at_location_id, so.operation_type_id,"
		                + " so.submitted_by, so.creator, so.changed_by, so.approval_required, so.submitted_date,"
		                + " so.reject_reason, so.return_reason"
		                + " from stockmgmt_stock_operation so"
		                + " join stockmgmt_stock_operation_type t on t.stock_operation_type_id = so.operation_type_id"
		                + " where so.uuid = :uuid and so.voided = 0")
		        .setParameter("uuid", stockOperationUuid).uniqueResult();
	}

	@Override
	@SuppressWarnings("unchecked")
	public List<Object[]> getStockRoleScopes(Integer locationId, Integer operationTypeId) throws DAOException {
		return sessionFactory.getCurrentSession()
		        .createSQLQuery("select distinct s.user_id, s.role"
		                + " from stockmgmt_user_role_scope s"
		                + " join stockmgmt_user_role_scope_location sl on sl.user_role_scope_id = s.user_role_scope_id"
		                + "   and sl.voided = 0"
		                + " where s.voided = 0 and s.enabled = 1"
		                + " and (s.is_permanent = 1 or (s.active_from <= now() and s.active_to >= now()))"
		                + " and (sl.location_id = :locationId or (sl.enable_descendants = 1 and exists ("
		                + "   select 1 from stockmgmt_location_tree lt"
		                + "   where lt.parent_location_id = sl.location_id and lt.child_location_id = :locationId)))"
		                + " and (not exists (select 1 from stockmgmt_user_role_scope_operation_type ot"
		                + "   where ot.user_role_scope_id = s.user_role_scope_id and ot.voided = 0)"
		                + "  or exists (select 1 from stockmgmt_user_role_scope_operation_type ot"
		                + "   where ot.user_role_scope_id = s.user_role_scope_id and ot.voided = 0"
		                + "   and ot.operation_type_id = :operationTypeId))")
		        .setParameter("locationId", locationId).setParameter("operationTypeId", operationTypeId).list();
	}
}
