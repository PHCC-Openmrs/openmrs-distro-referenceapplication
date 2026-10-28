package org.openmrs.module.stockmanagement.api.dto;

import java.math.BigDecimal;

/**
 * One batch a dispense takes stock from, and how much, in the batch's packaging unit.
 */
public class DispenseStockLine {

	private String stockItemUuid;

	private String stockBatchUuid;

	private String stockItemPackagingUOMUuid;

	private String locationUuid;

	private BigDecimal quantity;

	public String getStockItemUuid() {
		return stockItemUuid;
	}

	public void setStockItemUuid(String stockItemUuid) {
		this.stockItemUuid = stockItemUuid;
	}

	public String getStockBatchUuid() {
		return stockBatchUuid;
	}

	public void setStockBatchUuid(String stockBatchUuid) {
		this.stockBatchUuid = stockBatchUuid;
	}

	public String getStockItemPackagingUOMUuid() {
		return stockItemPackagingUOMUuid;
	}

	public void setStockItemPackagingUOMUuid(String stockItemPackagingUOMUuid) {
		this.stockItemPackagingUOMUuid = stockItemPackagingUOMUuid;
	}

	public String getLocationUuid() {
		return locationUuid;
	}

	public void setLocationUuid(String locationUuid) {
		this.locationUuid = locationUuid;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public void setQuantity(BigDecimal quantity) {
		this.quantity = quantity;
	}
}
