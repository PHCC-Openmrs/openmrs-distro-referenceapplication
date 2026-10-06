package org.openmrs.module.labtestreport;

/**
 * One row of a stock-by-location breakdown: a single stock item's total quantity moved
 * at a single location over the report's date range. Shared by the stock consumption
 * (quantity issued out of a location) and stock distribution (quantity transferred into
 * a location from a source) reports, since both are the same shape - just a different
 * operation type and location role feeding the query.
 */
public class StockLocationQtyRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private double quantity;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can
	// also be read as whole packs - 2,760 Tablet at 30 to a Box renders as "92 Box (2,760 Tablet)".
	// Both are null when the item has no bulk pack configured, and a factor of 1 (e.g. a Box of one
	// Bottle) leaves nothing worth converting - the consumer renders the plain unit in both cases
	// rather than "5 Box (5 Bottle)".
	private String bulkUnitName;

	private Double bulkFactor;

	/** Only populated for the Distribution report - null for Consumption and Wastage. */
	private String sourceLocationName;

	private double remainingQty;

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

	public String getSourceLocationName() {
		return sourceLocationName;
	}

	public void setSourceLocationName(String sourceLocationName) {
		this.sourceLocationName = sourceLocationName;
	}

	public double getRemainingQty() {
		return remainingQty;
	}

	public void setRemainingQty(double remainingQty) {
		this.remainingQty = remainingQty;
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
