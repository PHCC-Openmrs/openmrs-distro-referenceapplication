package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One batch/vendor breakdown line behind a Stock Consumption/Wastage/Distribution summary cell:
 * how much of the cell's total quantity came from this particular batch, and which vendor
 * originally supplied that batch - e.g. "100 boxes from batch A / Vendor X, 50 from batch B /
 * Vendor Y" for a single item+location summary row.
 */
public class StockMovementDetailRow {

	private String batchNo;

	private Date expirationDate;

	private String vendorName;

	private double quantity;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can
	// also be read as whole packs - 2,760 Tablet at 30 to a Box renders as "92 Box (2,760 Tablet)".
	// Both are null when the item has no bulk pack configured, and a factor of 1 (e.g. a Box of one
	// Bottle) leaves nothing worth converting - the consumer renders the plain unit in both cases
	// rather than "5 Box (5 Bottle)".
	private String bulkUnitName;

	private Double bulkFactor;

	// The raw packed externalReference of the batch's originating receipt/initial operation (the
	// same operation vendorName is derived from) - see ExternalReferenceParser for the format.
	private String externalReference;

	/** Only populated for the Wastage report - null for Consumption and Distribution. */
	private String reasonName;

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

	public String getVendorName() {
		return vendorName;
	}

	public void setVendorName(String vendorName) {
		this.vendorName = vendorName;
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

	public String getExternalReference() {
		return externalReference;
	}

	public void setExternalReference(String externalReference) {
		this.externalReference = externalReference;
	}

	public String getPurchaseOrderNo() {
		return ExternalReferenceParser.getPurchaseOrderNo(externalReference);
	}

	public String getPurchaseRequestNo() {
		return ExternalReferenceParser.getPurchaseRequestNo(externalReference);
	}

	public String getProjectFundCode() {
		return ExternalReferenceParser.getProjectFundCode(externalReference);
	}

	public String getReasonName() {
		return reasonName;
	}

	public void setReasonName(String reasonName) {
		this.reasonName = reasonName;
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
