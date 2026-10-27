package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the batch-history report: a single stock movement of a batch at one location.
 */
public class StockBatchHistoryRow {

	private Integer transactionId;

	private Date operationDate;

	private String operationNumber;

	private String operationUuid;

	// What the movement was from this location's point of view - one of the codes
	// queries/stock_batch_history.sql assigns (DISPENSED, TRANSFERRED_OUT, DISPOSED, ...).
	private String activity;

	private Integer stockItemId;

	private String itemName;

	private Integer stockBatchId;

	private String batchNo;

	// Null when the batch was received without an expiration date.
	private Date expirationDate;

	private Integer locationId;

	private String locationUuid;

	private String locationName;

	// The location or vendor on the other side of a transfer, issue, return or receipt; null for
	// one-sided operations.
	private String counterpartName;

	// Set only on a dispense.
	private String patientName;

	// Signed: positive is stock arriving at this location, negative is stock leaving it.
	private double quantity;

	private String reasonName;

	private String recordedBy;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds - see
	// StockBatchExpiryRow. Both null when the item has no bulk pack configured.
	private String bulkUnitName;

	private Double bulkFactor;

	public Integer getTransactionId() {
		return transactionId;
	}

	public void setTransactionId(Integer transactionId) {
		this.transactionId = transactionId;
	}

	public Date getOperationDate() {
		return operationDate;
	}

	public void setOperationDate(Date operationDate) {
		this.operationDate = operationDate;
	}

	public String getOperationNumber() {
		return operationNumber;
	}

	public void setOperationNumber(String operationNumber) {
		this.operationNumber = operationNumber;
	}

	public String getOperationUuid() {
		return operationUuid;
	}

	public void setOperationUuid(String operationUuid) {
		this.operationUuid = operationUuid;
	}

	public String getActivity() {
		return activity;
	}

	public void setActivity(String activity) {
		this.activity = activity;
	}

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

	public Integer getLocationId() {
		return locationId;
	}

	public void setLocationId(Integer locationId) {
		this.locationId = locationId;
	}

	public String getLocationUuid() {
		return locationUuid;
	}

	public void setLocationUuid(String locationUuid) {
		this.locationUuid = locationUuid;
	}

	public String getLocationName() {
		return locationName;
	}

	public void setLocationName(String locationName) {
		this.locationName = locationName;
	}

	public String getCounterpartName() {
		return counterpartName;
	}

	public void setCounterpartName(String counterpartName) {
		this.counterpartName = counterpartName;
	}

	public String getPatientName() {
		return patientName;
	}

	public void setPatientName(String patientName) {
		this.patientName = patientName;
	}

	public double getQuantity() {
		return quantity;
	}

	public void setQuantity(double quantity) {
		this.quantity = quantity;
	}

	public String getReasonName() {
		return reasonName;
	}

	public void setReasonName(String reasonName) {
		this.reasonName = reasonName;
	}

	public String getRecordedBy() {
		return recordedBy;
	}

	public void setRecordedBy(String recordedBy) {
		this.recordedBy = recordedBy;
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
