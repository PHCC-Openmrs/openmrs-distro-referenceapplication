package org.openmrs.module.stockmanagement.api.model;

import org.openmrs.*;

import java.io.Serializable;
import javax.persistence.*;
import java.math.BigDecimal;
import java.util.Date;
import java.util.UUID;

/**
 * The persistent class for the stockmgmt_stock_item_transaction database table.
 */
@Entity(name = "stockmanagement.StockItemTransaction")
@Table(name = "stockmgmt_stock_item_transaction")
public class StockItemTransaction extends TransactionBase implements Serializable {
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id", nullable = true)
	private Order order;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "encounter_id", nullable = true)
	private Encounter encounter;

	/**
	 * The dispense this movement was made for. order_id alone cannot identify it, because one order can
	 * be dispensed several times.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "medication_dispense_id", nullable = true)
	private MedicationDispense medicationDispense;

	public StockItemTransaction() {
	}
	
	public StockItemTransaction(TransactionBase tx) {
		super(tx);
	}
	
	public StockItemTransaction(StockOperation stockOperation, StockOperationItem item) {
		super(stockOperation, item);
	}
	
	public Order getOrder() {
		return order;
	}
	
	public void setOrder(Order order) {
		this.order = order;
	}
	
	public Encounter getEncounter() {
		return encounter;
	}
	
	public void setEncounter(Encounter encounter) {
		this.encounter = encounter;
	}

	public MedicationDispense getMedicationDispense() {
		return medicationDispense;
	}

	public void setMedicationDispense(MedicationDispense medicationDispense) {
		this.medicationDispense = medicationDispense;
	}
}
