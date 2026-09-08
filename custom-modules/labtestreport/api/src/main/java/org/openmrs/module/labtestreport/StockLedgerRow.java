package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the stock inventory ledger report: a single stock item's activity in a single
 * batch at a single location on a single day it actually had a transaction. {@link #actualQty}
 * (opening balance for the day) is derived as
 * {@code remainingQty - incomingQty + outgoingQty - openingAdjustmentQty}. Opening Stock
 * transactions are excluded from {@link #incomingQty}/{@link #outgoingQty}: they establish an
 * item's starting balance rather than a day's activity, so their amount is carried in
 * {@link #openingAdjustmentQty} and folded straight into the day's opening balance by the web
 * layer instead. Days a given item/location/batch had no activity at all are not represented
 * here - the web layer densifies this sparse list into a full item x location x batch x day
 * grid, carrying the last known balance forward across gaps.
 */
public class StockLedgerRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private String batchNo;

	private Date expirationDate;

	private Date ledgerDate;

	private double actualQty;

	private double openingAdjustmentQty;

	private double incomingQty;

	private double outgoingQty;

	private double remainingQty;

	private String unitName;

	// The raw packed externalReference (see ExternalReferenceParser) of the batch's originating
	// receipt/initial operation. Purchase Order No, Purchase Request No and Project Fund Code
	// describe the procurement that brought the batch into stock, so they belong to the batch as
	// a whole and are the same on every day of that batch's ledger - they are deliberately not
	// collected from the issues and transfers that later draw the batch down, whose own reference
	// numbers would otherwise be mixed into the batch's codes.
	private String externalReference;

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

	public Date getLedgerDate() {
		return ledgerDate;
	}

	public void setLedgerDate(Date ledgerDate) {
		this.ledgerDate = ledgerDate;
	}

	public double getActualQty() {
		return actualQty;
	}

	public void setActualQty(double actualQty) {
		this.actualQty = actualQty;
	}

	public double getOpeningAdjustmentQty() {
		return openingAdjustmentQty;
	}

	public void setOpeningAdjustmentQty(double openingAdjustmentQty) {
		this.openingAdjustmentQty = openingAdjustmentQty;
	}

	public double getIncomingQty() {
		return incomingQty;
	}

	public void setIncomingQty(double incomingQty) {
		this.incomingQty = incomingQty;
	}

	public double getOutgoingQty() {
		return outgoingQty;
	}

	public void setOutgoingQty(double outgoingQty) {
		this.outgoingQty = outgoingQty;
	}

	public double getRemainingQty() {
		return remainingQty;
	}

	public void setRemainingQty(double remainingQty) {
		this.remainingQty = remainingQty;
	}

	public String getUnitName() {
		return unitName;
	}

	public void setUnitName(String unitName) {
		this.unitName = unitName;
	}
}
