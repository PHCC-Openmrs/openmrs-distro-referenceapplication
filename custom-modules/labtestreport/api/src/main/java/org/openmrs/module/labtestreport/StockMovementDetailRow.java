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

	// The raw packed externalReference of the batch's originating receipt/initial operation (the
	// same operation vendorName is derived from) - see ExternalReferenceParser for the format.
	private String externalReference;

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
}
