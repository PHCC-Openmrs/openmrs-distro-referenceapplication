package org.openmrs.module.stockmanagement.api.impl;

import org.apache.commons.lang.StringUtils;
import org.openmrs.Concept;
import org.openmrs.DrugOrder;
import org.openmrs.MedicationDispense;
import org.openmrs.Order;
import org.openmrs.User;
import org.openmrs.api.MedicationDispenseService;
import org.openmrs.api.context.Context;
import org.openmrs.api.db.hibernate.HibernateUtil;
import org.openmrs.api.impl.BaseOpenmrsService;
import org.openmrs.module.stockmanagement.api.MedicationDispenseNotFoundException;
import org.openmrs.module.stockmanagement.api.MedicationDispenseStockService;
import org.openmrs.module.stockmanagement.api.StockManagementException;
import org.openmrs.module.stockmanagement.api.StockManagementService;
import org.openmrs.module.stockmanagement.api.dao.StockManagementDao;
import org.openmrs.module.stockmanagement.api.dto.DispenseRequest;
import org.openmrs.module.stockmanagement.api.dto.DispenseStockLine;
import org.openmrs.module.stockmanagement.api.dto.MedicationDispenseRequest;
import org.openmrs.module.stockmanagement.api.model.Party;
import org.openmrs.module.stockmanagement.api.model.StockBatch;
import org.openmrs.module.stockmanagement.api.model.StockItem;
import org.openmrs.module.stockmanagement.api.model.StockItemTransaction;
import org.openmrs.module.stockmanagement.api.model.StockOperation;
import org.openmrs.module.stockmanagement.api.model.StockOperationItem;
import org.openmrs.module.stockmanagement.api.model.StockOperationStatus;
import org.openmrs.module.stockmanagement.api.model.StockOperationType;
import org.openmrs.util.PrivilegeConstants;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class MedicationDispenseStockServiceImpl extends BaseOpenmrsService implements MedicationDispenseStockService {

	/** The concept source the FHIR module maps dispense status codes in. */
	private static final String DISPENSE_STATUS_SOURCE = "HL7-MedicationDispenseStatus";

	/** CIEL 1267 "Completed", used if the status mapping is missing. */
	private static final String COMPLETED_STATUS_CONCEPT_UUID = "1267AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

	/** Dispensed and ordered quantities are doubles, so compare them with a little slack. */
	private static final double QUANTITY_TOLERANCE = 0.0001;

	/**
	 * Saving and deleting a dispense needs these. They are granted only for the length of a call, so a role
	 * can be given this service without also being able to save a dispense directly through FHIR, which
	 * takes no stock.
	 */
	private static final String[] DISPENSE_PRIVILEGES = { PrivilegeConstants.GET_MEDICATION_DISPENSE,
	        PrivilegeConstants.EDIT_MEDICATION_DISPENSE, PrivilegeConstants.DELETE_MEDICATION_DISPENSE };

	private StockManagementDao dao;

	private Concept completedStatus;

	public void setDao(StockManagementDao dao) {
		this.dao = dao;
	}

	/** Sets the "completed" dispense status concept instead of looking it up; tests have no FHIR mapping. */
	public void setCompletedStatus(Concept completedStatus) {
		this.completedStatus = completedStatus;
	}

	@Override
	public List<MedicationDispense> saveMedicationDispenses(List<MedicationDispenseRequest> requests) {
		if (requests == null || requests.isEmpty()) {
			return Collections.emptyList();
		}
		grantDispensePrivileges();
		try {
			return save(requests);
		}
		finally {
			revokeDispensePrivileges();
		}
	}

	@Override
	public MedicationDispense voidMedicationDispense(String uuid, boolean fulfillerStatusSpecified,
	        Order.FulfillerStatus fulfillerStatus, String reason) {
		grantDispensePrivileges();
		try {
			MedicationDispenseService dispenseService = Context.getMedicationDispenseService();
			MedicationDispense dispense = dispenseService.getMedicationDispenseByUuid(uuid);
			if (dispense == null) {
				throw notFound(uuid);
			}
			Order order = dispense.getDrugOrder() == null ? null
			        : HibernateUtil.getRealObjectFromProxy(dispense.getDrugOrder());
			if (order != null) {
				dao.lockOrdersForUpdate(Collections.singleton(order.getOrderId()));
			}
			dao.lockStockBatchesForUpdate(stockBatchIdsToReturn(dispense));

			// Another request may have deleted it while this one waited for the locks.
			dao.getSession().refresh(dispense);
			if (dispense.getVoided()) {
				return dispense;
			}
			if (order != null) {
				dao.getSession().refresh(order);
			}

			returnStock(dispense, "deleted");
			dispenseService.voidMedicationDispense(dispense,
			    StringUtils.isBlank(reason) ? "Deleted from the dispensing app" : reason);
			if (fulfillerStatusSpecified && order != null) {
				setFulfillerStatus(order, fulfillerStatus);
			}
			return dispense;
		}
		finally {
			revokeDispensePrivileges();
		}
	}

	private List<MedicationDispense> save(List<MedicationDispenseRequest> requests) {
		MedicationDispenseService dispenseService = Context.getMedicationDispenseService();
		Concept completed = getCompletedStatus();

		// Find every order and batch the requests touch and lock them before deciding anything: orders first,
		// then batches, each in id order, which every path that takes these locks follows.
		Map<String, DrugOrder> orders = new HashMap<>();
		Map<MedicationDispenseRequest, MedicationDispense> existingDispenses = new IdentityHashMap<>();
		Set<Integer> orderIds = new HashSet<>();
		for (MedicationDispenseRequest request : requests) {
			if (StringUtils.isBlank(request.getUuid())) {
				throw new StockManagementException(message("stockmanagement.dispense.uuidrequired"));
			}
			DrugOrder order = orders.computeIfAbsent(request.getOrderUuid(), this::getDrugOrder);
			orderIds.add(order.getOrderId());
			if (request.isUpdate()) {
				MedicationDispense dispense = dispenseService.getMedicationDispenseByUuid(request.getUuid());
				if (dispense == null || dispense.getVoided()) {
					throw notFound(request.getUuid());
				}
				existingDispenses.put(request, dispense);
				if (dispense.getDrugOrder() != null) {
					orderIds.add(dispense.getDrugOrder().getOrderId());
				}
			}
		}
		dao.lockOrdersForUpdate(orderIds);

		Set<Integer> batchIds = new HashSet<>();
		for (MedicationDispenseRequest request : requests) {
			for (DispenseStockLine line : request.getStockLines()) {
				batchIds.add(getStockBatch(line).getId());
			}
		}
		for (MedicationDispense dispense : existingDispenses.values()) {
			batchIds.addAll(stockBatchIdsToReturn(dispense));
		}
		dao.lockStockBatchesForUpdate(batchIds);

		// Re-read what the locks now protect; another request may have changed it while this one waited.
		for (DrugOrder order : orders.values()) {
			dao.getSession().refresh(order);
		}
		for (MedicationDispense dispense : existingDispenses.values()) {
			dao.getSession().refresh(dispense);
			if (dispense.getVoided()) {
				throw notFound(dispense.getUuid());
			}
		}

		List<MedicationDispense> saved = new ArrayList<>();
		List<DispenseRequest> stockToTake = new ArrayList<>();
		for (MedicationDispenseRequest request : requests) {
			DrugOrder order = orders.get(request.getOrderUuid());
			MedicationDispense dispense;
			if (request.isUpdate()) {
				dispense = existingDispenses.get(request);
				// Give back what the dispense took before it changes; the new lines are taken below.
				returnStock(dispense, "edited");
				dispense = request.getBuilder().build(dispense);
			} else {
				MedicationDispense alreadySaved = dispenseService.getMedicationDispenseByUuid(request.getUuid());
				if (alreadySaved != null) {
					// A retry of a request that was saved but whose response never reached the browser.
					saved.add(alreadySaved);
					continue;
				}
				dispense = request.getBuilder().build(null);
				dispense.setUuid(request.getUuid());
			}
			if (dispense.getDrugOrder() == null || !order.getOrderId().equals(dispense.getDrugOrder().getOrderId())) {
				throw new StockManagementException(
				        String.format(message("stockmanagement.dispense.ordermismatch"), request.getOrderUuid()));
			}

			boolean isCompleted = completed.equals(dispense.getStatus());
			if (isCompleted && request.getStockLines().isEmpty()) {
				throw new StockManagementException(
				        String.format(message("stockmanagement.dispense.stockrequired"), describe(dispense)));
			}
			if (!isCompleted && !request.getStockLines().isEmpty()) {
				throw new StockManagementException(message("stockmanagement.dispense.stocknotallowed"));
			}
			boolean fullyDispensed = isCompleted && request.isRestrictTotalQuantityDispensed()
			        && isFullyDispensedAfter(dispense, order, completed);

			dispenseService.saveMedicationDispense(dispense);
			for (DispenseStockLine line : request.getStockLines()) {
				stockToTake.add(toDispenseRequest(line, dispense, order));
			}

			if (fullyDispensed) {
				setFulfillerStatus(order, Order.FulfillerStatus.COMPLETED);
			} else if (request.isFulfillerStatusSpecified()) {
				setFulfillerStatus(order, request.getFulfillerStatus());
			}
			saved.add(dispense);
		}

		// All lines in one call, so lines of different dispenses on the same batch are checked together.
		if (!stockToTake.isEmpty()) {
			Context.getService(StockManagementService.class).dispenseStockItems(stockToTake);
		}
		return saved;
	}

	/**
	 * Checks the dispense does not take the prescription past its ordered quantity (refills included), and
	 * says whether it completes it. The total already dispensed is read from the database while the order
	 * is locked, so two pharmacists dispensing the same prescription can't both use up what is left.
	 */
	private boolean isFullyDispensedAfter(MedicationDispense dispense, DrugOrder order, Concept completed) {
		if (order.getQuantity() == null || dispense.getQuantity() == null || dispense.getQuantityUnits() == null
		        || !dispense.getQuantityUnits().equals(order.getQuantityUnits())) {
			// Without an ordered quantity in the same unit there is nothing to compare against; the dispensing
			// app itself refuses quantities in a different unit.
			return false;
		}
		int refills = order.getNumRefills() == null ? 0 : order.getNumRefills();
		double ordered = order.getQuantity() * (1 + refills);
		double alreadyDispensed = dao.sumDispensedQuantityForOrder(order.getOrderId(), completed,
		    dispense.getQuantityUnits(), dispense.getUuid());
		double total = alreadyDispensed + dispense.getQuantity();
		if (total > ordered + QUANTITY_TOLERANCE) {
			String unit = " " + dispense.getQuantityUnits().getDisplayString();
			throw new StockManagementException(String.format(message("stockmanagement.dispense.quantityexceeded"),
			    formatQuantity(Math.max(0, ordered - alreadyDispensed)) + unit, describe(dispense),
			    formatQuantity(dispense.getQuantity()) + unit));
		}
		return total >= ordered - QUANTITY_TOLERANCE;
	}

	private DispenseRequest toDispenseRequest(DispenseStockLine line, MedicationDispense dispense, DrugOrder order) {
		if (line.getQuantity() == null || line.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
			throw new StockManagementException(message("stockmanagement.dispense.quantityrequired"));
		}
		StockBatch batch = getStockBatch(line);
		StockItem stockItem = batch.getStockItem();
		// Never take another drug's stock, whatever the browser sent.
		if ((line.getStockItemUuid() != null && !line.getStockItemUuid().equals(stockItem.getUuid()))
		        || (dispense.getDrug() != null && stockItem.getDrug() != null && !dispense.getDrug().equals(
		            stockItem.getDrug()))) {
			throw new StockManagementException(String.format(message("stockmanagement.dispense.batchwrongitem"),
			    batch.getBatchNo(), describe(dispense)));
		}

		DispenseRequest request = new DispenseRequest();
		request.setLocationUuid(line.getLocationUuid());
		request.setPatientId(dispense.getPatient().getPatientId());
		request.setOrderId(order.getOrderId());
		request.setEncounterId(order.getEncounter() == null ? null : order.getEncounter().getEncounterId());
		request.setStockItemUuid(stockItem.getUuid());
		request.setStockBatchUuid(batch.getUuid());
		request.setStockItemPackagingUOMUuid(line.getStockItemPackagingUOMUuid());
		request.setQuantity(line.getQuantity());
		request.setMedicationDispense(dispense);
		return request;
	}

	/**
	 * Gives back the stock a dispense has taken, as a completed adjustment on the same batches, so an edit can
	 * take its new batches and a delete leaves the batches as they were. The adjustment rows are linked to the
	 * dispense too, so its net stock effect is zero afterwards and a later edit returns only what it took since.
	 */
	private void returnStock(MedicationDispense dispense, String change) {
		Order order = dispense.getDrugOrder() == null ? null : HibernateUtil.getRealObjectFromProxy(dispense
		        .getDrugOrder());
		if (order != null && !dao.hasStockTransactionsForMedicationDispense(dispense.getId())
		        && getCompletedStatus().equals(dispense.getStatus())) {
			adoptUnlinkedStock(dispense, order);
		}

		Map<Integer, List<Object[]>> stillOutByParty = dao.getMedicationDispenseStockNet(dispense.getId()).stream()
		        .filter(net -> ((BigDecimal) net[4]).compareTo(BigDecimal.ZERO) < 0)
		        .collect(Collectors.groupingBy(net -> (Integer) net[0]));
		if (stillOutByParty.isEmpty()) {
			return;
		}
		StockOperationType adjustment = dao.getStockOperationTypeByType(StockOperationType.ADJUSTMENT);
		if (adjustment == null) {
			throw new StockManagementException(message("stockmanagement.stockoperation.notfound"));
		}
		User user = Context.getAuthenticatedUser();
		Date now = new Date();
		for (Map.Entry<Integer, List<Object[]>> partyLines : stillOutByParty.entrySet()) {
			Party party = dao.getPartyById(partyLines.getKey());
			StockOperation operation = new StockOperation();
			operation.setStockOperationType(adjustment);
			operation.setOperationOrder(1);
			operation.setLocked(false);
			operation.setStatus(StockOperationStatus.COMPLETED);
			operation.setCreator(user);
			operation.setDateCreated(now);
			operation.setOperationDate(now);
			operation.setAtLocation(party.getLocation());
			operation.setSource(party);
			operation.setResponsiblePerson(user);
			operation.setCompletedBy(user);
			operation.setCompletedDate(now);
			operation.setRemarks(String.format(message("stockmanagement.dispense.stockreturned"), dispense.getUuid(),
			    change));
			operation.setStockOperationItems(new HashSet<>());
			operation.setStockItemTransactions(new HashSet<>());

			for (Object[] net : partyLines.getValue()) {
				BigDecimal quantity = ((BigDecimal) net[4]).negate();
				StockOperationItem item = new StockOperationItem();
				item.setCreator(user);
				item.setDateCreated(now);
				item.setStockItem(dao.getStockItemById((Integer) net[1]));
				item.setStockBatch(dao.getStockBatchById((Integer) net[2]));
				item.setStockItemPackagingUOM(dao.getStockItemPackagingUOMById((Integer) net[3]));
				item.setQuantity(quantity);
				operation.addStockOperationItem(item);

				StockItemTransaction transaction = new StockItemTransaction(operation, item);
				transaction.setParty(party);
				transaction.setPatient(dispense.getPatient());
				transaction.setOrder(order);
				transaction.setEncounter(order == null ? null : order.getEncounter());
				transaction.setMedicationDispense(dispense);
				transaction.setCreator(user);
				transaction.setDateCreated(now);
				transaction.setQuantity(quantity);
				operation.addStockItemTransaction(transaction);
			}
			dao.saveStockOperation(operation);
			operation.setOperationNumber(String.format("%1s-%2s", adjustment.getAcronym(),
			    StringUtils.leftPad(Integer.toString(operation.getId()), 4, '0')));
			dao.saveStockOperation(operation);
		}
	}

	/**
	 * Stock rows saved before rows were linked to the individual dispense carry only the order. They belong to
	 * this dispense if it is the only completed one on the order; otherwise there is no telling whose they are,
	 * and returning the wrong dispense's stock would corrupt the balance, so the change is refused.
	 */
	private void adoptUnlinkedStock(MedicationDispense dispense, Order order) {
		List<StockItemTransaction> unlinked = dao.getUnlinkedDispenseTransactionsForOrder(order.getOrderId());
		if (unlinked.isEmpty()) {
			return;
		}
		if (dao.countMedicationDispensesForOrder(order.getOrderId(), getCompletedStatus()) != 1) {
			throw new StockManagementException(message("stockmanagement.dispense.legacystockambiguous"));
		}
		for (StockItemTransaction transaction : unlinked) {
			transaction.setMedicationDispense(dispense);
		}
		dao.getSession().flush();
	}

	/** The batches returning a dispense's stock would touch, so they can be locked first. */
	private List<Integer> stockBatchIdsToReturn(MedicationDispense dispense) {
		List<Integer> linked = dao.getStockBatchIdsForMedicationDispense(dispense.getId());
		if (!linked.isEmpty() || dispense.getDrugOrder() == null) {
			return linked;
		}
		return dao.getUnlinkedDispenseTransactionsForOrder(dispense.getDrugOrder().getOrderId()).stream()
		        .map(transaction -> transaction.getStockBatch().getId()).distinct().collect(Collectors.toList());
	}

	private void setFulfillerStatus(Order order, Order.FulfillerStatus status) {
		if (order.getFulfillerStatus() == status) {
			return;
		}
		// updateOrderFulfillerStatus ignores a null status, so a status being cleared is set on the order first.
		order.setFulfillerStatus(status);
		Context.getOrderService().updateOrderFulfillerStatus(order, status, null);
	}

	private DrugOrder getDrugOrder(String orderUuid) {
		Order order = StringUtils.isBlank(orderUuid) ? null : Context.getOrderService().getOrderByUuid(orderUuid);
		if (order == null) {
			throw new StockManagementException(String.format(message("stockmanagement.dispense.ordernotfound"),
			    orderUuid));
		}
		order = HibernateUtil.getRealObjectFromProxy(order);
		if (!(order instanceof DrugOrder)) {
			throw new StockManagementException(String.format(message("stockmanagement.dispense.notdrugorder"),
			    orderUuid));
		}
		return (DrugOrder) order;
	}

	private StockBatch getStockBatch(DispenseStockLine line) {
		StockBatch batch = StringUtils.isBlank(line.getStockBatchUuid()) ? null : dao.getStockBatchByUuid(line
		        .getStockBatchUuid());
		if (batch == null) {
			throw new StockManagementException(String.format(message("stockmanagement.dispense.batchnotfound"),
			    line.getStockBatchUuid()));
		}
		return batch;
	}

	private Concept getCompletedStatus() {
		if (completedStatus == null) {
			Concept concept = Context.getConceptService().getConceptByMapping("completed", DISPENSE_STATUS_SOURCE);
			if (concept == null) {
				concept = Context.getConceptService().getConceptByUuid(COMPLETED_STATUS_CONCEPT_UUID);
			}
			if (concept == null) {
				throw new StockManagementException("The 'completed' medication dispense status concept was not found");
			}
			completedStatus = concept;
		}
		return completedStatus;
	}

	private MedicationDispenseNotFoundException notFound(String uuid) {
		return new MedicationDispenseNotFoundException(String.format(message("stockmanagement.dispense.notfound"),
		    uuid));
	}

	private static String describe(MedicationDispense dispense) {
		if (dispense.getDrug() != null) {
			return dispense.getDrug().getDisplayName();
		}
		return dispense.getConcept() == null ? "this medication" : dispense.getConcept().getDisplayString();
	}

	private static String formatQuantity(double quantity) {
		return BigDecimal.valueOf(quantity).stripTrailingZeros().toPlainString();
	}

	private static void grantDispensePrivileges() {
		for (String privilege : DISPENSE_PRIVILEGES) {
			Context.addProxyPrivilege(privilege);
		}
	}
	
	private static void revokeDispensePrivileges() {
		for (String privilege : DISPENSE_PRIVILEGES) {
			Context.removeProxyPrivilege(privilege);
		}
	}
	
	private static String message(String code) {
		return Context.getMessageSourceService().getMessage(code);
	}
}
