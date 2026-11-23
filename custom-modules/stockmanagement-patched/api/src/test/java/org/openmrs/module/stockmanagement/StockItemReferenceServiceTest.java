package org.openmrs.module.stockmanagement;

import org.junit.Before;
import org.junit.Test;
import org.openmrs.Drug;
import org.openmrs.api.context.Context;
import org.openmrs.api.db.hibernate.DbSessionFactory;
import org.openmrs.module.stockmanagement.api.StockManagementException;
import org.openmrs.module.stockmanagement.api.dao.StockManagementDao;
import org.openmrs.module.stockmanagement.api.impl.StockManagementServiceImpl;
import org.openmrs.module.stockmanagement.api.model.StockItem;
import org.openmrs.module.stockmanagement.api.model.StockItemReference;
import org.openmrs.module.stockmanagement.api.model.StockSource;
import org.openmrs.test.BaseModuleContextSensitiveTest;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.containsString;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.fail;

/**
 * {@link StockManagementServiceImpl#saveStockItemReference}: the (code, source) unique key covers deleted
 * references and all items, so saving must reuse a deleted row and explain a clash with a live one.
 */
public class StockItemReferenceServiceTest extends BaseModuleContextSensitiveTest {

	@Autowired
	DbSessionFactory sessionFactory;

	private StockManagementDao dao;

	private StockManagementServiceImpl service;

	private StockItem itemA;

	private StockItem itemB;

	private StockSource vendor;

	@Before
	public void setup() {
		dao = new StockManagementDao();
		dao.setSessionFactory(sessionFactory);
		service = new StockManagementServiceImpl();
		service.setDao(dao);

		itemA = newStockItem(Context.getConceptService().getDrug(2));
		itemB = newStockItem(Context.getConceptService().getDrug(3));
		vendor = entityUtil(Context.getConceptService().getDrug(2)).newStockSource(dao);
		vendor.setVoided(false);
		vendor.setName("Vendor A");
		dao.saveStockSource(vendor);
		sessionFactory.getCurrentSession().flush();
	}

	@Test
	public void saveStockItemReference_shouldReuseADeletedReferenceWithTheSameSourceAndCode() {
		StockItemReference original = service.saveStockItemReference(reference(itemA, "CODE-1"));
		sessionFactory.getCurrentSession().flush();
		dao.voidStockItemReference(original.getUuid(), "deleted", 1);
		sessionFactory.getCurrentSession().clear();

		StockItemReference saved = service.saveStockItemReference(reference(itemB, "CODE-1"));
		sessionFactory.getCurrentSession().flush();
		sessionFactory.getCurrentSession().clear();

		assertEquals(original.getId(), saved.getId());
		StockItemReference reloaded = dao.getStockItemReferenceByUuid(original.getUuid());
		assertFalse(reloaded.getVoided());
		assertNull(reloaded.getVoidReason());
		assertEquals(itemB.getId(), reloaded.getStockItem().getId());
		assertEquals(1, dao.getStockItemReferenceByStockItem(reloaded.getStockItem()).size());
	}

	@Test
	public void saveStockItemReference_shouldAllowTheSameSourceWithADifferentCode() {
		StockItemReference first = service.saveStockItemReference(reference(itemA, "CODE-1"));
		StockItemReference second = service.saveStockItemReference(reference(itemA, "CODE-2"));
		sessionFactory.getCurrentSession().flush();

		assertNotEquals(first.getId(), second.getId());
		assertEquals(2, dao.getStockItemReferenceByStockItem(itemA).size());
	}

	@Test
	public void saveStockItemReference_shouldRejectALiveDuplicateOnTheSameItem() {
		service.saveStockItemReference(reference(itemA, "CODE-1"));
		sessionFactory.getCurrentSession().flush();

		assertRejected(reference(itemA, " CODE-1 "), "Vendor A already has a reference with code CODE-1");
	}

	@Test
	public void saveStockItemReference_shouldNameTheItemThatAlreadyUsesTheCode() {
		service.saveStockItemReference(reference(itemA, "CODE-1"));
		sessionFactory.getCurrentSession().flush();

		assertRejected(reference(itemB, "CODE-1"), "is already used by " + itemA.getDrug().getName());
	}

	@Test
	public void saveStockItemReference_shouldRequireACode() {
		assertRejected(reference(itemA, "  "), "Enter a code");
	}

	@Test
	public void saveStockItemReference_shouldTrimTheCode() {
		StockItemReference saved = service.saveStockItemReference(reference(itemA, "  CODE-1  "));

		assertEquals("CODE-1", saved.getStockReferenceCode());
	}

	private void assertRejected(StockItemReference reference, String expectedMessage) {
		try {
			service.saveStockItemReference(reference);
			fail("Expected the reference to be rejected");
		}
		catch (StockManagementException e) {
			assertThat(e.getMessage(), containsString(expectedMessage));
		}
	}

	private StockItemReference reference(StockItem stockItem, String code) {
		StockItemReference reference = new StockItemReference();
		reference.setStockItem(stockItem);
		reference.setReferenceSource(vendor);
		reference.setStockReferenceCode(code);
		return reference;
	}

	private StockItem newStockItem(Drug drug) {
		StockItem stockItem = entityUtil(drug).newStockItem(dao, false);
		stockItem.setVoided(false);
		dao.saveStockItem(stockItem);
		return stockItem;
	}

	private EntityUtil entityUtil(Drug drug) {
		return new EntityUtil(drug, Context.getUserService().getUser(501), Context.getLocationService().getLocation(1),
		        null, drug.getConcept(), null);
	}
}
