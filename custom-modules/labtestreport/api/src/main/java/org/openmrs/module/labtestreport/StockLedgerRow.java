package org.openmrs.module.labtestreport;

import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Set;

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

	// Distinct raw packed externalReference strings (see ExternalReferenceParser) of every
	// operation that contributed a transaction to this item/batch/location on this day, joined
	// with ";;" - a day's activity for one batch can span more than one operation.
	private String externalReferences;

	public String getExternalReferences() {
		return externalReferences;
	}

	public void setExternalReferences(String externalReferences) {
		this.externalReferences = externalReferences;
	}

	private String joinedDistinctParts(java.util.function.Function<String, String> partExtractor) {
		if (externalReferences == null || externalReferences.isEmpty()) {
			return "";
		}
		Set<String> parts = new LinkedHashSet<>();
		for (String reference : externalReferences.split(";;")) {
			String part = partExtractor.apply(reference);
			if (part != null && !part.isEmpty()) {
				parts.add(part);
			}
		}
		return String.join(", ", parts);
	}

	public String getPurchaseOrderNo() {
		return joinedDistinctParts(ExternalReferenceParser::getPurchaseOrderNo);
	}

	public String getPurchaseRequestNo() {
		return joinedDistinctParts(ExternalReferenceParser::getPurchaseRequestNo);
	}

	public String getProjectFundCode() {
		return joinedDistinctParts(ExternalReferenceParser::getProjectFundCode);
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
