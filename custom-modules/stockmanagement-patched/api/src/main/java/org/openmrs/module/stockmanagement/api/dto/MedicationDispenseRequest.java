package org.openmrs.module.stockmanagement.api.dto;

import org.openmrs.MedicationDispense;
import org.openmrs.Order;

import java.util.ArrayList;
import java.util.List;

/**
 * A dispense to save together with the prescription status change and the stock it takes, as one unit of
 * work: either all of it is saved or none of it.
 */
public class MedicationDispenseRequest {

	/**
	 * Produces the dispense to save. For a new dispense {@code existing} is null and a new object is
	 * returned; for an edit the requested changes are applied to {@code existing}. It is called inside the
	 * transaction, after the locks are taken.
	 */
	public interface DispenseBuilder {

		MedicationDispense build(MedicationDispense existing);
	}

	private String uuid;

	private String orderUuid;

	private boolean update;

	private DispenseBuilder builder;

	private boolean fulfillerStatusSpecified;

	private Order.FulfillerStatus fulfillerStatus;

	private boolean restrictTotalQuantityDispensed;

	private List<DispenseStockLine> stockLines = new ArrayList<>();

	/**
	 * The dispense's uuid. For a new dispense the client generates it, so a retried request finds the
	 * dispense it already saved instead of saving it twice.
	 */
	public String getUuid() {
		return uuid;
	}

	public void setUuid(String uuid) {
		this.uuid = uuid;
	}

	/** The prescription (drug order) being dispensed. */
	public String getOrderUuid() {
		return orderUuid;
	}

	public void setOrderUuid(String orderUuid) {
		this.orderUuid = orderUuid;
	}

	public boolean isUpdate() {
		return update;
	}

	public void setUpdate(boolean update) {
		this.update = update;
	}

	public DispenseBuilder getBuilder() {
		return builder;
	}

	public void setBuilder(DispenseBuilder builder) {
		this.builder = builder;
	}

	/**
	 * Whether the prescription's fulfiller status should be set to {@link #getFulfillerStatus()}; when
	 * false it is left as it is. A null status with this set clears it.
	 */
	public boolean isFulfillerStatusSpecified() {
		return fulfillerStatusSpecified;
	}

	public void setFulfillerStatusSpecified(boolean fulfillerStatusSpecified) {
		this.fulfillerStatusSpecified = fulfillerStatusSpecified;
	}

	public Order.FulfillerStatus getFulfillerStatus() {
		return fulfillerStatus;
	}

	public void setFulfillerStatus(Order.FulfillerStatus fulfillerStatus) {
		this.fulfillerStatus = fulfillerStatus;
	}

	/**
	 * Mirrors the dispensing app's restrictTotalQuantityDispensed setting: no more than the ordered
	 * quantity (refills included) may be dispensed, and the prescription is completed once it all has been.
	 */
	public boolean isRestrictTotalQuantityDispensed() {
		return restrictTotalQuantityDispensed;
	}

	public void setRestrictTotalQuantityDispensed(boolean restrictTotalQuantityDispensed) {
		this.restrictTotalQuantityDispensed = restrictTotalQuantityDispensed;
	}

	public List<DispenseStockLine> getStockLines() {
		return stockLines;
	}

	public void setStockLines(List<DispenseStockLine> stockLines) {
		this.stockLines = stockLines == null ? new ArrayList<>() : stockLines;
	}
}
