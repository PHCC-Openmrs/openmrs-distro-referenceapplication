package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One Adjustment line: a single stock item's quantity change on a single operation, carrying the
 * reason and remarks recorded on that operation's header.
 * <p>
 * Adjustment is used for two unrelated purposes - correcting a miscount on a drug item, and
 * recording routine usage of a non-drug commodity that has no dispensing workflow of its own.
 * {@link #getPurpose()} says which one the chosen reason means, and {@link #isMismatched()} flags
 * the rows where that disagrees with the item's own drug/non-drug identity, which is how mis-filed
 * entries surface.
 */
public class StockAdjustmentRow {

	/** What the reason concept says this adjustment was for. */
	public enum Purpose {
		/** Routine usage drawn down through an adjustment - the non-drug commodity workflow. */
		CONSUMPTION,
		/** A miscount, data-entry error or damage being corrected - the drug workflow. */
		CORRECTION
	}

	private Date operationDate;

	private String operationNumber;

	private Integer locationId;

	private String locationName;

	private Integer stockItemId;

	private String itemName;

	private Boolean isDrug;

	private String batchNo;

	private Date expirationDate;

	/**
	 * Signed, in dispensing units: negative for a decrease, positive for an increase. Unlike the
	 * wastage and consumption reports the sign is kept rather than normalised, since which
	 * direction the adjustment went is the substance of the row.
	 */
	private double quantity;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can
	// also be read as whole packs - 2,760 Tablet at 30 to a Box renders as "92 Box (2,760 Tablet)".
	// Both are null when the item has no bulk pack configured, and a factor of 1 (e.g. a Box of one
	// Bottle) leaves nothing worth converting - the consumer renders the plain unit in both cases
	// rather than "5 Box (5 Bottle)".
	private String bulkUnitName;

	private Double bulkFactor;

	private String reasonUuid;

	private String reasonName;

	private String remarks;

	private String responsiblePerson;

	private Purpose purpose;

	private boolean mismatched;

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

	/**
	 * Named getIsDrug rather than isDrug so the serialised field stays "isDrug" - Jackson would
	 * publish an isDrug() getter as plain "drug", which is not what the frontend reads.
	 */
	public Boolean getIsDrug() {
		return isDrug;
	}

	public void setIsDrug(Boolean isDrug) {
		this.isDrug = isDrug;
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

	public String getReasonUuid() {
		return reasonUuid;
	}

	public void setReasonUuid(String reasonUuid) {
		this.reasonUuid = reasonUuid;
	}

	public String getReasonName() {
		return reasonName;
	}

	public void setReasonName(String reasonName) {
		this.reasonName = reasonName;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public String getResponsiblePerson() {
		return responsiblePerson;
	}

	public void setResponsiblePerson(String responsiblePerson) {
		this.responsiblePerson = responsiblePerson;
	}

	public Purpose getPurpose() {
		return purpose;
	}

	public void setPurpose(Purpose purpose) {
		this.purpose = purpose;
	}

	public boolean isMismatched() {
		return mismatched;
	}

	public void setMismatched(boolean mismatched) {
		this.mismatched = mismatched;
	}
}
