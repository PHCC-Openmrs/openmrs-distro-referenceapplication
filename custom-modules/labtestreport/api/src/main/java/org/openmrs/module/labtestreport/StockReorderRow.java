package org.openmrs.module.labtestreport;

/**
 * One row of the reorder-status report: an item at a location whose usable stock has fallen below
 * its configured reorder level.
 * <p>
 * {@link #onHandQty} counts only batches that have not expired, because what an item should be
 * reordered against is what it can dispense - the stock module will not release an expired batch
 * for anything but a Disposal. {@link #expiredQty} carries the expired remainder so a row flagged
 * while physical stock sits on the shelf explains itself.
 */
public class StockReorderRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private String ruleName;

	private double reorderLevel;

	private double onHandQty;

	private double expiredQty;

	private String unitName;

	// The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can
	// also be read as whole packs - 2,760 Tablet at 30 to a Box renders as "92 Box (2,760 Tablet)".
	// Both are null when the item has no bulk pack configured, and a factor of 1 (e.g. a Box of one
	// Bottle) leaves nothing worth converting - the consumer renders the plain unit in both cases
	// rather than "5 Box (5 Bottle)".
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

	public String getRuleName() {
		return ruleName;
	}

	public void setRuleName(String ruleName) {
		this.ruleName = ruleName;
	}

	public double getReorderLevel() {
		return reorderLevel;
	}

	public void setReorderLevel(double reorderLevel) {
		this.reorderLevel = reorderLevel;
	}

	public double getOnHandQty() {
		return onHandQty;
	}

	public void setOnHandQty(double onHandQty) {
		this.onHandQty = onHandQty;
	}

	public double getExpiredQty() {
		return expiredQty;
	}

	public void setExpiredQty(double expiredQty) {
		this.expiredQty = expiredQty;
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
