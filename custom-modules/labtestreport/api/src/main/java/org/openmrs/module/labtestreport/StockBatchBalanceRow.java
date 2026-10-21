package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the batch-balance report: the quantity of one batch of an item left at a location.
 */
public class StockBatchBalanceRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private Integer stockBatchId;

	private String batchNo;

	// Null when the batch was received without an expiration date.
	private Date expirationDate;

	private double quantity;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds - see
	// StockBatchExpiryRow. Both null when the item has no bulk pack configured.
	private String bulkUnitName;

	private Double bulkFactor;

	public Integer getStockItemId() {
		return stockItemId;
	}

	public void setStockItemId(Integer stockItemId) {
		this.stockItemId = stockItemId;
	}

	public String getItemName() {
		return itemName;
	}

	public void setItemName(String itemName) {
		this.itemName = itemName;
	}

	public Integer getLocationId() {
		return locationId;
	}

	public void setLocationId(Integer locationId) {
		this.locationId = locationId;
	}

	public String getLocationName() {
		return locationName;
	}

	public void setLocationName(String locationName) {
		this.locationName = locationName;
	}

	public Integer getStockBatchId() {
		return stockBatchId;
	}

	public void setStockBatchId(Integer stockBatchId) {
		this.stockBatchId = stockBatchId;
	}

	public String getBatchNo() {
		return batchNo;
	}

	public void setBatchNo(String batchNo) {
		this.batchNo = batchNo;
	}

	public Date getExpirationDate() {
		return expirationDate;
	}

	public void setExpirationDate(Date expirationDate) {
		this.expirationDate = expirationDate;
	}

	public double getQuantity() {
		return quantity;
	}

	public void setQuantity(double quantity) {
		this.quantity = quantity;
	}

	public String getUnitName() {
		return unitName;
	}

	public void setUnitName(String unitName) {
		this.unitName = unitName;
	}

	public String getBulkUnitName() {
		return bulkUnitName;
	}

	public void setBulkUnitName(String bulkUnitName) {
		this.bulkUnitName = bulkUnitName;
	}

	public Double getBulkFactor() {
		return bulkFactor;
	}

	public void setBulkFactor(Double bulkFactor) {
		this.bulkFactor = bulkFactor;
	}
}
