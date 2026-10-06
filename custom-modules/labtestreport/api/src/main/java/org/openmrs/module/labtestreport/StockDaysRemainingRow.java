package org.openmrs.module.labtestreport;

/**
 * One row of the days-of-stock-remaining report: an item at a location, what it can currently
 * dispense, and how long that lasts at its recent consumption rate.
 * <p>
 * {@link #onHandQty} counts only batches that have not expired, so {@link #daysRemaining} forecasts
 * cover the location actually has. {@link #expiredQty} carries the expired remainder, which is
 * still physically on the shelf until someone disposes of it - so the physical total is
 * {@code onHandQty + expiredQty}, and an item reading zero usable stock can be seen to be zero
 * because its stock expired.
 */
public class StockDaysRemainingRow {

	private Integer stockItemId;

	private String itemName;

	private Integer locationId;

	private String locationName;

	private double onHandQty;

	private double expiredQty;

	private double avgDailyConsumption;

	private Double daysRemaining;

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

	public double getAvgDailyConsumption() {
		return avgDailyConsumption;
	}

	public void setAvgDailyConsumption(double avgDailyConsumption) {
		this.avgDailyConsumption = avgDailyConsumption;
	}

	/**
	 * Null when there has been no recorded consumption in the averaging window, meaning the
	 * days-remaining estimate is undefined (not zero, not infinite - simply unknown).
	 */
	public Double getDaysRemaining() {
		return daysRemaining;
	}

	public void setDaysRemaining(Double daysRemaining) {
		this.daysRemaining = daysRemaining;
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
