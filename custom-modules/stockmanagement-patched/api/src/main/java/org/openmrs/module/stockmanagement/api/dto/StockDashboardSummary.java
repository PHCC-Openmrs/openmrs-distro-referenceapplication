package org.openmrs.module.stockmanagement.api.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Everything the stock management Overview page shows for one location, computed on the server so the
 * page makes one request instead of one per stock item (see
 * {@link org.openmrs.module.stockmanagement.api.StockManagementService#getStockDashboardSummary}).
 */
public class StockDashboardSummary {

	/** Weeks covered by the out-of-stock trend, as days before today; 0 is today. Oldest first. */
	public static final int[] HISTORY_DAYS_AGO = { 28, 21, 14, 7, 0 };

	/**
	 * Expiring-stock batches are those expiring within this many days. The page applies the exact window
	 * itself (in the browser's time zone); the server sends batches up to one day past it.
	 */
	public static final int EXPIRY_WINDOW_DAYS = 180;

	private List<ItemLevel> outOfStockItems = new ArrayList<>();

	private List<ItemLevel> understockedItems = new ArrayList<>();

	private List<HistoryPoint> outOfStockHistory = new ArrayList<>();

	private List<ExpiringBatch> expiringBatches = new ArrayList<>();

	private List<StockOperationDTO> disposals = new ArrayList<>();

	public List<ItemLevel> getOutOfStockItems() {
		return outOfStockItems;
	}

	public List<ItemLevel> getUnderstockedItems() {
		return understockedItems;
	}

	public List<HistoryPoint> getOutOfStockHistory() {
		return outOfStockHistory;
	}

	public List<ExpiringBatch> getExpiringBatches() {
		return expiringBatches;
	}

	public List<StockOperationDTO> getDisposals() {
		return disposals;
	}

	public void setDisposals(List<StockOperationDTO> disposals) {
		this.disposals = disposals;
	}

	/** A stock item and the quantity the location holds, in the unit named by quantityUoM. */
	public static class ItemLevel {

		private final StockItemDTO stockItem;

		private final BigDecimal quantity;

		private final String quantityUoM;

		public ItemLevel(StockItemDTO stockItem, BigDecimal quantity, String quantityUoM) {
			this.stockItem = stockItem;
			this.quantity = quantity;
			this.quantityUoM = quantityUoM;
		}

		public StockItemDTO getStockItem() {
			return stockItem;
		}

		public BigDecimal getQuantity() {
			return quantity;
		}

		public String getQuantityUoM() {
			return quantityUoM;
		}
	}

	public static class HistoryPoint {

		private final int daysAgo;

		private final int outOfStockCount;

		public HistoryPoint(int daysAgo, int outOfStockCount) {
			this.daysAgo = daysAgo;
			this.outOfStockCount = outOfStockCount;
		}

		public int getDaysAgo() {
			return daysAgo;
		}

		public int getOutOfStockCount() {
			return outOfStockCount;
		}
	}

	/** A batch the location holds stock of, with the quantity in the unit named by quantityUoM. */
	public static class ExpiringBatch {

		private final StockItemDTO stockItem;

		private final String stockBatchUuid;

		private final String batchNo;

		private final Date expiration;

		private final BigDecimal quantity;

		private final String quantityUoM;

		public ExpiringBatch(StockItemDTO stockItem, String stockBatchUuid, String batchNo, Date expiration,
		    BigDecimal quantity, String quantityUoM) {
			this.stockItem = stockItem;
			this.stockBatchUuid = stockBatchUuid;
			this.batchNo = batchNo;
			this.expiration = expiration;
			this.quantity = quantity;
			this.quantityUoM = quantityUoM;
		}

		public StockItemDTO getStockItem() {
			return stockItem;
		}

		public String getStockBatchUuid() {
			return stockBatchUuid;
		}

		public String getBatchNo() {
			return batchNo;
		}

		public Date getExpiration() {
			return expiration;
		}

		public BigDecimal getQuantity() {
			return quantity;
		}

		public String getQuantityUoM() {
			return quantityUoM;
		}
	}
}
