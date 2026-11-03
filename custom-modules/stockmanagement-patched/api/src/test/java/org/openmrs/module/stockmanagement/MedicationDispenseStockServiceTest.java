package org.openmrs.module.stockmanagement;

import org.junit.Before;
import org.junit.Test;
import org.openmrs.Concept;
import org.openmrs.DrugOrder;
import org.openmrs.MedicationDispense;
import org.openmrs.api.context.Context;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.stockmanagement.api.StockManagementException;
import org.openmrs.module.stockmanagement.api.dao.StockManagementDao;
import org.openmrs.module.stockmanagement.api.dto.DispenseStockLine;
import org.openmrs.module.stockmanagement.api.dto.MedicationDispenseRequest;
import org.openmrs.module.stockmanagement.api.impl.MedicationDispenseStockServiceImpl;
import org.openmrs.module.stockmanagement.api.model.StockBatch;
import org.openmrs.module.stockmanagement.api.model.StockItem;
import org.openmrs.module.stockmanagement.api.model.StockItemPackagingUOM;
import org.openmrs.module.stockmanagement.api.model.StockItemTransaction;
import org.openmrs.test.BaseModuleContextSensitiveTest;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.UUID;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

/**
 * The prescribed-quantity cap and extra quantity of {@link MedicationDispenseStockServiceImpl}. Order 1 of
 * the core test data set (ASPIRIN, patient 7) is set to 20 units with no refills.
 */
public class MedicationDispenseStockServiceTest extends BaseModuleContextSensitiveTest {

	private static final int ORDER_ID = 1;

	@Autowired
	DbSessionFactory sessionFactory;

	private MedicationDispenseStockServiceImpl service;

	private Concept completed;

	private StockManagementDao dao;

	private StockItem stockItem;

	private StockBatch stockBatch;

	private StockItemPackagingUOM packagingUom;

	@Before
	public void setup() throws Exception {
		executeDataSet(EntityUtil.STOCK_OPERATION_TYPE_DATA_SET);
		Context.getAdministrationService().executeSQL(
		    "update drug_order set quantity = 20, num_refills = 0 where order_id = " + ORDER_ID, false);
		sessionFactory.getCurrentSession().clear();

		dao = new StockManagementDao();
		dao.setSessionFactory(sessionFactory);
		completed = Context.getConceptService().getConcept(5089);
		service = new MedicationDispenseStockServiceImpl();
		service.setDao(dao);
		service.setCompletedStatus(completed);

		EntityUtil eu = new EntityUtil(getOrder().getDrug(), Context.getUserService().getUser(501), Context
		        .getLocationService().getLocation(1), null, getOrder().getDrug().getConcept(), getOrder().getPatient());
		stockItem = eu.newStockItem(dao, false);
		stockItem.setVoided(false);
		dao.saveStockItem(stockItem);
		packagingUom = eu.newStockItemPackagingUOM(dao, false, stockItem);
		packagingUom.setVoided(false);
		packagingUom.setFactor(BigDecimal.ONE);
		dao.saveStockItemPackagingUOM(packagingUom);
		stockBatch = eu.newStockBatch(dao, stockItem);
		stockBatch.setVoided(false);
		dao.saveStockBatch(stockBatch);
		StockItemTransaction received = eu.newStockItemTransaction(dao, stockItem, stockBatch, packagingUom);
		received.setQuantity(BigDecimal.valueOf(100));
		received.setPatient(null);
		dao.saveStockItemTransaction(received);
	}

	private DrugOrder getOrder() {
		return (DrugOrder) Context.getOrderService().getOrder(ORDER_ID);
	}

	private MedicationDispenseRequest request(double quantity, double extra) {
		DrugOrder order = getOrder();
		MedicationDispenseRequest request = new MedicationDispenseRequest();
		request.setUuid(UUID.randomUUID().toString());
		request.setOrderUuid(order.getUuid());
		request.setRestrictTotalQuantityDispensed(true);
		request.setExtraQuantity(BigDecimal.valueOf(extra));
		request.setBuilder(existing -> {
			MedicationDispense dispense = new MedicationDispense();
			dispense.setPatient(order.getPatient());
			dispense.setDrugOrder(order);
			dispense.setDrug(order.getDrug());
			dispense.setConcept(order.getConcept());
			dispense.setStatus(completed);
			dispense.setQuantity(quantity);
			dispense.setQuantityUnits(order.getQuantityUnits());
			return dispense;
		});
		DispenseStockLine line = new DispenseStockLine();
		line.setStockItemUuid(stockItem.getUuid());
		line.setStockBatchUuid(stockBatch.getUuid());
		line.setStockItemPackagingUOMUuid(packagingUom.getUuid());
		line.setLocationUuid(Context.getLocationService().getLocation(1).getUuid());
		line.setQuantity(BigDecimal.valueOf(quantity));
		request.getStockLines().add(line);
		return request;
	}

	private void save(MedicationDispenseRequest request) {
		service.saveMedicationDispenses(Collections.singletonList(request));
		sessionFactory.getCurrentSession().flush();
	}

	private void assertRefused(MedicationDispenseRequest request, String messageFragment) {
		try {
			save(request);
			fail("Expected the dispense to be refused");
		}
		catch (StockManagementException e) {
			assertTrue(e.getMessage(), e.getMessage().contains(messageFragment));
		}
	}

	private BigDecimal batchBalance() {
		return (BigDecimal) sessionFactory
		        .getCurrentSession()
		        .createQuery(
		            "select sum(t.quantity) from org.openmrs.module.stockmanagement.api.model.StockItemTransaction t"
		                    + " where t.stockBatch = :batch").setParameter("batch", stockBatch).uniqueResult();
	}

	@Test
	public void save_shouldTakeTheWholeQuantityIncludingExtraWhenEverythingLeftIsDispensed() {
		save(request(25, 5));

		assertEquals(0, BigDecimal.valueOf(75).compareTo(batchBalance()));
		sessionFactory.getCurrentSession().refresh(getOrder());
		assertEquals(DrugOrder.FulfillerStatus.COMPLETED, getOrder().getFulfillerStatus());
	}

	@Test
	public void save_shouldRefuseExtraWhenNotEverythingLeftIsDispensed() {
		assertRefused(request(15, 5), "Extra quantity");
	}

	@Test
	public void save_shouldRefuseAnotherDispenseOnceEverythingHasBeenDispensed() {
		save(request(25, 5));

		// A second screen still showing the prescription as not dispensed.
		assertRefused(request(20, 0), "Only 0");
		assertRefused(request(25, 5), "Only 0");
		assertRefused(request(5, 5), "Extra quantity");
		assertEquals(0, BigDecimal.valueOf(75).compareTo(batchBalance()));
	}

	@Test
	public void save_shouldAllowExtraOnTheDispenseThatUsesUpWhatIsLeft() {
		save(request(10, 0));
		assertRefused(request(15, 0), "Only 10");
		save(request(13, 3));

		assertEquals(0, BigDecimal.valueOf(77).compareTo(batchBalance()));
	}
}
