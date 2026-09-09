package org.openmrs.module.labtestreport.web;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;

import org.openmrs.module.labtestreport.StockLedgerRow;

/**
 * Turns the sparse rows returned by the service (one row per item/day it actually had activity)
 * into a dense item x day grid, carrying each item's balance forward across days it had no
 * activity, so the pivot table always shows every tracked item on every day in range.
 * <p>
 * Known limitation, deliberately left alone: this pivot has one column group per stock item, so
 * {@code byItemAndDate} is keyed on stockItemId alone. When one item had activity at two locations
 * or in two batches on the same day, the last row wins and the others are dropped - the figures
 * here collapse locations and batches together. The O3 report
 * (frontend/esm-labtestreport-app/src/stock-ledger) keys on item + location + batch and is the one
 * to trust; fixing this page means giving it Location and Batch columns and re-keying these maps,
 * which is a change to a legacy admin screen the O3 report has superseded.
 */
public class StockLedgerGrouping {

	public static List<StockLedgerItem> buildItemList(List<StockLedgerRow> rows) {
		Map<Integer, String> byId = new LinkedHashMap<>();
		for (StockLedgerRow row : rows) {
			byId.putIfAbsent(row.getStockItemId(), row.getItemName());
		}
		List<StockLedgerItem> items = new ArrayList<>();
		for (Map.Entry<Integer, String> entry : byId.entrySet()) {
			items.add(new StockLedgerItem(entry.getKey(), entry.getValue()));
		}
		items.sort(Comparator.comparing(StockLedgerItem::getItemName));
		return items;
	}

	public static List<StockLedgerDayBlock> buildDayBlocks(List<StockLedgerRow> rows, List<StockLedgerItem> items) {
		Map<Integer, Map<Date, StockLedgerRow>> byItemAndDate = new HashMap<>();
		// Carry-in is reported per item/location/batch while this pivot shows one column group per
		// item, so the groups have to be collected separately and summed. carryInQty is constant
		// across all of a group's rows, hence a plain put keyed by group rather than an addition.
		Map<Integer, Map<String, Double>> carryInByItemAndGroup = new HashMap<>();
		SortedSet<Date> allDates = new TreeSet<>();
		for (StockLedgerRow row : rows) {
			byItemAndDate.computeIfAbsent(row.getStockItemId(), k -> new HashMap<>()).put(row.getLedgerDate(), row);
			carryInByItemAndGroup.computeIfAbsent(row.getStockItemId(), k -> new HashMap<>())
			        .put(row.getLocationId() + "-" + row.getBatchNo(), row.getCarryInQty());
			allDates.add(row.getLedgerDate());
		}

		// Seeded from what each item already held before the range opened, so a date-filtered
		// report opens at the right balance instead of restarting from zero.
		Map<Integer, Double> lastRemaining = new HashMap<>();
		for (StockLedgerItem item : items) {
			double carryIn = 0d;
			Map<String, Double> groups = carryInByItemAndGroup.get(item.getStockItemId());
			if (groups != null) {
				for (Double value : groups.values()) {
					carryIn += value;
				}
			}
			lastRemaining.put(item.getStockItemId(), carryIn);
		}

		List<StockLedgerDayBlock> blocks = new ArrayList<>();
		for (Date date : allDates) {
			StockLedgerDayBlock block = new StockLedgerDayBlock();
			block.setDate(date);
			List<StockLedgerRow> cells = new ArrayList<>();
			for (StockLedgerItem item : items) {
				Map<Date, StockLedgerRow> byDate = byItemAndDate.get(item.getStockItemId());
				StockLedgerRow actualRow = byDate == null ? null : byDate.get(date);
				double opening = lastRemaining.get(item.getStockItemId());

				StockLedgerRow cell = new StockLedgerRow();
				cell.setStockItemId(item.getStockItemId());
				cell.setItemName(item.getItemName());
				cell.setLedgerDate(date);
				if (actualRow != null) {
					// actualQty is already the day's Opening Balance, with arrivals folded in, and
					// is computed from the row itself by StockLedgerServiceImpl - so it is copied
					// rather than recomputed here from the running total.
					cell.setActualQty(actualRow.getActualQty());
					cell.setInflowQty(actualRow.getInflowQty());
					cell.setOutgoingQty(actualRow.getOutgoingQty());
					cell.setRemainingQty(actualRow.getRemainingQty());
					cell.setCarryInQty(actualRow.getCarryInQty());
					cell.setExternalReference(actualRow.getExternalReference());
					lastRemaining.put(item.getStockItemId(), actualRow.getRemainingQty());
				} else {
					cell.setActualQty(opening);
					cell.setInflowQty(0);
					cell.setOutgoingQty(0);
					cell.setRemainingQty(opening);
				}
				cells.add(cell);
			}
			block.setCells(cells);
			blocks.add(block);
		}
		return blocks;
	}
}
