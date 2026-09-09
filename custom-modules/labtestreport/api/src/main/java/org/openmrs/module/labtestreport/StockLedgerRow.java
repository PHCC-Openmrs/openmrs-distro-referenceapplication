package org.openmrs.module.labtestreport;

import java.util.Date;

/**
 * One row of the stock inventory ledger report: a single stock item's activity in a single batch
 * at a single location on a single day it actually had a transaction.
 * <p>
 * Quantities are bucketed by the <strong>sign</strong> of the transaction, not by operation type.
 * So {@link #outgoingQty} holds every kind of outflow alike - a Transfer Out's source leg, a
 * Disposal, and a dispense (which the stock module records as a {@code stockissue}) - and
 * {@link #inflowQty} holds every kind of arrival alike, whether from an Opening Stock, a transfer
 * in, or a receipt.
 * <p>
 * Only three quantities are rendered, and they satisfy
 * {@code actualQty - outgoingQty == remainingQty} on every row:
 * <ul>
 * <li>{@link #actualQty} - the day's <em>Opening Balance</em>, meaning everything available at
 * that location that day: the previous day's closing balance <em>plus</em> that day's arrivals.
 * Derived row-locally as {@code remainingQty + outgoingQty}.
 * <li>{@link #outgoingQty} - what left that day.
 * <li>{@link #remainingQty} - the closing balance.
 * </ul>
 * Note what {@link #actualQty} is <em>not</em>: {@code remainingQty - inflowQty + outgoingQty}
 * reduces to the previous day's closing balance, i.e. the <em>pre-arrival</em> figure. That
 * excludes the day's arrivals and breaks the identity above on any day with an inflow - including
 * the day a transfer lands at its destination. The two forms agree on outflow-only days, which is
 * what makes the mistake easy to miss.
 * <p>
 * {@link #inflowQty} and {@link #carryInQty} are carried for densification and cross-checking
 * rather than rendered as columns of the O3 report. {@link #carryInQty} is what the
 * item/location/batch already held before the reporting range opened, and is 0 when the report has
 * no lower bound.
 * <p>
 * Days a given item/location/batch had no activity at all are not represented here - the web layer
 * densifies this sparse list into a full item x location x batch x day grid, carrying the last
 * known balance forward across gaps. The one exception is a zero-quantity anchor row dated
 * {@code startDate}, which the query emits for anything holding carried-in stock so that a batch
 * untouched throughout the range still appears with its balance instead of vanishing.
 */
public class StockLedgerRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private String batchNo;

	// The real stock_batch primary key, distinct from batchNo (the free-text batch number a user
	// types on Opening Stock / Receipt). Two batches can carry the same batchNo text - grouping or
	// keying report rows by batchNo alone silently merges them; batchId is the actual batch identity.
	private Integer batchId;

	private Date expirationDate;

	private Date ledgerDate;

	private double actualQty;

	private double inflowQty;

	private double carryInQty;

	private double outgoingQty;

	private double remainingQty;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can
	// also be read as whole packs - 2,760 Tablet at 30 to a Box renders as "92 Box (2,760 Tablet)".
	// Both are null when the item has no bulk pack configured, and a factor of 1 (e.g. a Box of one
	// Bottle) leaves nothing worth converting - the consumer renders the plain unit in both cases
	// rather than "5 Box (5 Bottle)".
	private String bulkUnitName;

	private Double bulkFactor;

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

	public Integer getBatchId() {
		return batchId;
	}

	public void setBatchId(Integer batchId) {
		this.batchId = batchId;
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

	public double getInflowQty() {
		return inflowQty;
	}

	public void setInflowQty(double inflowQty) {
		this.inflowQty = inflowQty;
	}

	public double getCarryInQty() {
		return carryInQty;
	}

	public void setCarryInQty(double carryInQty) {
		this.carryInQty = carryInQty;
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
