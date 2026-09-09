import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, InlineLoading, Search, Select, SelectItem, Switch } from '@carbon/react';
import { ChevronDown, ChevronRight } from '@carbon/react/icons';
import { useLocations, formatDate, parseDate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import SimpleBarChart from '../reports-shell/simple-bar-chart.component';
import SimpleLineChart from '../reports-shell/simple-line-chart.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import MonthCompareControls from '../reports-shell/month-compare-controls.component';
import ComparisonSummaryTable from '../reports-shell/comparison-summary-table.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import { buildKpiExportSheet, buildComparisonExportSheet, type ExportSheet } from '../reports-shell/export-utils';
import { useMonthComparison } from '../reports-shell/month-compare';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { bulkExportCells, formatQuantity } from '../reports-shell/format-quantity';
import pageStyles from '../reports-shell/reports-page.scss';
import { useStockLedgerReport, type StockLedgerRow } from './stock-ledger.resource';

interface LedgerItem {
  key: string;
  stockItemId: number;
  itemName: string;
  locationId: number;
  locationName: string | null;
  batchNo: string | null;
  batchId: number;
  expirationDate: string | null;
  // Purchase Order No / Purchase Request No / Project Fund Code come from the procurement that
  // brought the batch into stock, so they belong to the batch rather than to any one day of its
  // ledger - they live here, on the batch, and every day row of that batch reads the same value.
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
}

interface DayBlock {
  date: string;
  cells: Array<StockLedgerRow>;
}

// Grouping key is per item/location/batch - a day's activity for the same item at the same
// location can span multiple batches, each with its own opening/closing balance and expiry.
//
// Keyed off batchId (the real stock_batch primary key), not batchNo: batchNo is free text a user
// types on Opening Stock / Receipt, so two distinct batches can share the same batchNo text. Keying
// off batchNo would silently merge them - collapsing their metadata to whichever was seen first in
// buildItemList, and in buildDayBlocks, letting one's row overwrite the other's in the per-date Map
// whenever both have activity on the same day.
function groupKey(stockItemId: number, locationId: number, batchId: number): string {
  return `${stockItemId}-${locationId}-${batchId}`;
}

// The item/location key the table's top level groups on. Batches hang underneath it, so an item
// received several times reads as one item with several lots rather than as several look-alike rows.
function itemKey(stockItemId: number, locationId: number): string {
  return `${stockItemId}-${locationId}`;
}

function countItemLocationPairs(items: Array<LedgerItem>): number {
  return new Set(items.map((item) => itemKey(item.stockItemId, item.locationId))).size;
}

function itemLocationLabel(itemName: string, locationName: string | null, showLocation: boolean): string {
  return showLocation ? `${itemName} — ${locationName ?? '?'}` : itemName;
}

// A batch number on its own is not an identity: it is free text a user types on Opening Stock /
// Receipt, so two different lots of the same item routinely carry the same one. Labelling a lot by
// its number alone renders both identically in the chart, the trend picker and the comparison
// table. The expiry is what separates them, the same way it does in the table's own column.
function batchLabel(batchNo: string | null, expirationDate: string | null): string {
  if (!batchNo) {
    return expirationDate ? `exp ${formatExpirationDate(expirationDate)}` : '';
  }
  return expirationDate ? `${batchNo} · exp ${formatExpirationDate(expirationDate)}` : batchNo;
}

function groupLabel(
  itemName: string,
  locationName: string | null,
  batchNo: string | null,
  expirationDate: string | null,
  showLocation: boolean,
): string {
  const base = itemLocationLabel(itemName, locationName, showLocation);
  const batch = batchLabel(batchNo, expirationDate);
  return batch ? `${base} (${batch})` : base;
}

function formatExpirationDate(expirationDate: string | null): string {
  return expirationDate ? formatDate(parseDate(expirationDate), { mode: 'standard', time: false }) : '—';
}

// Batches holding carried-in stock but with no activity in the range are picked up here like any
// other: stock_ledger_report.sql emits a zero-quantity anchor row for them dated startDate, and it
// comes through the same batch_reference/unit joins, so it arrives with its PO/PR/Fund codes and
// remainingQty = carryInQty. Don't optimise that anchor row out of the query - it is what stops a
// dormant batch vanishing from a date-filtered report.
function buildItemList(rows: Array<StockLedgerRow>): Array<LedgerItem> {
  const byKey = new Map<string, LedgerItem>();
  rows.forEach((row) => {
    const key = groupKey(row.stockItemId, row.locationId, row.batchId);
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        stockItemId: row.stockItemId,
        itemName: row.itemName,
        locationId: row.locationId,
        locationName: row.locationName,
        batchNo: row.batchNo,
        batchId: row.batchId,
        expirationDate: row.expirationDate,
        purchaseOrderNo: row.purchaseOrderNo,
        purchaseRequestNo: row.purchaseRequestNo,
        projectFundCode: row.projectFundCode,
      });
    }
  });
  return Array.from(byKey.values()).sort(
    (a, b) =>
      a.itemName.localeCompare(b.itemName) ||
      (a.locationName ?? '').localeCompare(b.locationName ?? '') ||
      compareExpiration(a.expirationDate, b.expirationDate) ||
      (a.batchNo ?? '').localeCompare(b.batchNo ?? '') ||
      a.batchId - b.batchId,
  );
}

// Lots of one item are ordered earliest-expiry-first, undated ones last: that is the order stock is
// meant to be issued in, and it gives two lots sharing a batch number a stable, meaningful order
// instead of whatever order the query happened to return them in. Dates arrive as yyyy-MM-dd, so a
// string compare is a date compare.
function compareExpiration(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b);
}

function buildDayBlocks(rows: Array<StockLedgerRow>, items: Array<LedgerItem>): Array<DayBlock> {
  const byItemAndDate = new Map<string, Map<string, StockLedgerRow>>();
  const unitNameByItem = new Map<string, string | null>();
  // The pack is a property of the stock item, so it is constant across a group's rows and can be
  // stashed once per group the same way the dispensing unit is.
  const bulkByItem = new Map<string, Pick<StockLedgerRow, 'bulkUnitName' | 'bulkFactor'>>();
  const carryInByItem = new Map<string, number>();
  const firstDateByItem = new Map<string, string>();
  const allDates = new Set<string>();
  rows.forEach((row) => {
    const key = groupKey(row.stockItemId, row.locationId, row.batchId);
    if (!byItemAndDate.has(key)) {
      byItemAndDate.set(key, new Map());
    }
    byItemAndDate.get(key)!.set(row.ledgerDate, row);
    unitNameByItem.set(key, row.unitName);
    bulkByItem.set(key, { bulkUnitName: row.bulkUnitName, bulkFactor: row.bulkFactor });
    carryInByItem.set(key, row.carryInQty);
    allDates.add(row.ledgerDate);
    const firstDate = firstDateByItem.get(key);
    if (!firstDate || row.ledgerDate < firstDate) {
      firstDateByItem.set(key, row.ledgerDate);
    }
  });

  // Seeded from what each batch already held before the range opened, so a date-filtered report
  // opens at the right balance instead of restarting from zero.
  const lastRemaining = new Map<string, number>();
  items.forEach((item) => lastRemaining.set(item.key, carryInByItem.get(item.key) ?? 0));

  return Array.from(allDates)
    .sort()
    .map((date) => {
      // allDates spans every item/location/batch in the filtered result, not just this one - an
      // item/batch shouldn't get a zero continuation row for a date before its own first real
      // transaction just because something else was active at the same location that day.
      const cells: Array<StockLedgerRow> = items
        .filter((item) => date >= (firstDateByItem.get(item.key) ?? date))
        .map((item) => {
          const byDate = byItemAndDate.get(item.key);
          const actualRow = byDate?.get(date);
          const opening = lastRemaining.get(item.key) ?? 0;
          if (actualRow) {
            lastRemaining.set(item.key, actualRow.remainingQty);
            // actualQty is already the day's Opening Balance with arrivals folded in, derived from
            // the row itself server-side, so it's used as-is rather than recomputed from the
            // running total - which is what keeps Opening - Outgoing = Balance true on every row.
            return actualRow;
          }
          return {
            stockItemId: item.stockItemId,
            itemName: item.itemName,
            locationId: item.locationId,
            locationName: item.locationName,
            batchNo: item.batchNo,
            batchId: item.batchId,
            expirationDate: item.expirationDate,
            ledgerDate: date,
            actualQty: opening,
            inflowQty: 0,
            outgoingQty: 0,
            remainingQty: opening,
            carryInQty: carryInByItem.get(item.key) ?? 0,
            unitName: unitNameByItem.get(item.key) ?? null,
            bulkUnitName: bulkByItem.get(item.key)?.bulkUnitName ?? null,
            bulkFactor: bulkByItem.get(item.key)?.bulkFactor ?? null,
            purchaseOrderNo: item.purchaseOrderNo,
            purchaseRequestNo: item.purchaseRequestNo,
            projectFundCode: item.projectFundCode,
          };
        });
      return { date, cells };
    })
    // A batch carried forward with a non-zero balance survives on its actualQty/remainingQty alone,
    // while one fully consumed before the range (carry-in 0, no activity) is still dropped.
    .filter((block) => block.cells.some((cell) => cell.actualQty || cell.outgoingQty || cell.remainingQty));
}

function filterRows(rows: Array<StockLedgerRow>, itemFilter: string, searchText: string): Array<StockLedgerRow> {
  const search = searchText.trim().toLowerCase();
  return rows.filter((row) => {
    if (itemFilter && row.itemName !== itemFilter) {
      return false;
    }
    if (!search) {
      return true;
    }
    return row.itemName.toLowerCase().includes(search) || (row.locationName ?? '').toLowerCase().includes(search);
  });
}

function buildFlatRows(dayBlocks: Array<DayBlock>): Array<StockLedgerRow> {
  return [...dayBlocks]
    .flatMap((block) => block.cells)
    .sort(
      (a, b) =>
        a.itemName.localeCompare(b.itemName) ||
        (a.locationName ?? '').localeCompare(b.locationName ?? '') ||
        (a.batchNo ?? '').localeCompare(b.batchNo ?? '') ||
        a.batchId - b.batchId ||
        a.ledgerDate.localeCompare(b.ledgerDate),
    );
}

interface LedgerGroup {
  key: string;
  // Grouping the batches into items keys on these, not on the item and location names: two stock
  // items can share a common_name, and two locations a name, and merging either would fold
  // unrelated stock into one balance.
  stockItemId: number;
  locationId: number;
  itemName: string;
  locationName: string | null;
  batchNo: string | null;
  batchId: number;
  expirationDate: string | null;
  rows: Array<StockLedgerRow>;
  openingBalance: number;
  totalOutgoing: number;
  latestRemaining: number;
  unitName: string | null;
  bulkUnitName: string | null;
  bulkFactor: number | null;
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
}

function buildGroupedRows(items: Array<LedgerItem>, flatRows: Array<StockLedgerRow>): Array<LedgerGroup> {
  return items.map((item) => {
    const rows = flatRows.filter((row) => groupKey(row.stockItemId, row.locationId, row.batchId) === item.key);
    const totalOutgoing = rows.reduce((sum, row) => sum + row.outgoingQty, 0);
    const latestRemaining = rows.length > 0 ? rows[rows.length - 1].remainingQty : 0;
    return {
      key: item.key,
      stockItemId: item.stockItemId,
      locationId: item.locationId,
      itemName: item.itemName,
      locationName: item.locationName,
      batchNo: item.batchNo,
      batchId: item.batchId,
      expirationDate: item.expirationDate,
      rows,
      // Everything ever available to this group over the range - its carry-in plus every day's
      // arrivals - which is latestRemaining + totalOutgoing. That makes the collapsed header row
      // satisfy Opening - Outgoing = Balance just like the day rows do. rows[0].actualQty would
      // only be right if every arrival landed on the group's first day, which is false for any
      // location that receives more than one transfer within the range.
      openingBalance: latestRemaining + totalOutgoing,
      totalOutgoing,
      latestRemaining,
      unitName: rows.length > 0 ? rows[0].unitName : null,
      bulkUnitName: rows.length > 0 ? rows[0].bulkUnitName : null,
      bulkFactor: rows.length > 0 ? rows[0].bulkFactor : null,
      purchaseOrderNo: item.purchaseOrderNo,
      purchaseRequestNo: item.purchaseRequestNo,
      projectFundCode: item.projectFundCode,
    };
  });
}

interface ItemGroup {
  key: string;
  itemName: string;
  locationName: string | null;
  batches: Array<LedgerGroup>;
  openingBalance: number;
  totalOutgoing: number;
  latestRemaining: number;
  dayCount: number;
  unitName: string | null;
  bulkUnitName: string | null;
  bulkFactor: number | null;
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
  // Batch numbers this item carries on more than one lot. They are flagged in the table rather than
  // merged: same number with a different expiry is two real lots, and merging them would report one
  // expiry date over stock that does not all expire then.
  duplicateBatchNos: Set<string>;
}

// A procurement code is shown on a collapsed item row only when every lot underneath agrees on it.
// Otherwise the row would attribute one lot's purchase order to the item's whole balance.
function sharedValue(values: Array<string | null>): string | null {
  const present = values.filter((value): value is string => Boolean(value));
  if (present.length !== values.length || present.length === 0) {
    return null;
  }
  const distinct = new Set(present);
  return distinct.size === 1 ? present[0] : null;
}

// Turns the flat list of batch groups into one entry per item/location with its lots nested inside.
// Quantities sum safely across those lots: the unit comes from the stock item's dispensing unit, so
// every batch of an item is counted in the same unit.
function buildItemGroups(groups: Array<LedgerGroup>): Array<ItemGroup> {
  const byKey = new Map<string, ItemGroup>();
  groups.forEach((group) => {
    const key = itemKey(group.stockItemId, group.locationId);
    let itemGroup = byKey.get(key);
    if (!itemGroup) {
      itemGroup = {
        key,
        itemName: group.itemName,
        locationName: group.locationName,
        batches: [],
        openingBalance: 0,
        totalOutgoing: 0,
        latestRemaining: 0,
        dayCount: 0,
        unitName: null,
        bulkUnitName: null,
        bulkFactor: null,
        purchaseOrderNo: null,
        purchaseRequestNo: null,
        projectFundCode: null,
        duplicateBatchNos: new Set(),
      };
      byKey.set(key, itemGroup);
    }
    itemGroup.batches.push(group);
    itemGroup.openingBalance += group.openingBalance;
    itemGroup.totalOutgoing += group.totalOutgoing;
    itemGroup.latestRemaining += group.latestRemaining;
    itemGroup.unitName = itemGroup.unitName ?? group.unitName;
    // Safe to take from whichever lot arrives first, for the same reason the unit is: the pack
    // belongs to the stock item, so every lot of an item reports the same one.
    itemGroup.bulkUnitName = itemGroup.bulkUnitName ?? group.bulkUnitName;
    itemGroup.bulkFactor = itemGroup.bulkFactor ?? group.bulkFactor;
  });

  return Array.from(byKey.values()).map((itemGroup) => {
    // Days are counted as distinct dates across the item's lots, not as a sum of each lot's rows -
    // three lots all moving on one day is one day of activity, not three.
    const dates = new Set<string>();
    const batchNoCounts = new Map<string, number>();
    itemGroup.batches.forEach((batch) => {
      batch.rows.forEach((row) => dates.add(row.ledgerDate));
      if (batch.batchNo) {
        batchNoCounts.set(batch.batchNo, (batchNoCounts.get(batch.batchNo) ?? 0) + 1);
      }
    });
    const duplicateBatchNos = new Set(
      Array.from(batchNoCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([batchNo]) => batchNo),
    );
    return {
      ...itemGroup,
      dayCount: dates.size,
      duplicateBatchNos,
      purchaseOrderNo: sharedValue(itemGroup.batches.map((batch) => batch.purchaseOrderNo)),
      purchaseRequestNo: sharedValue(itemGroup.batches.map((batch) => batch.purchaseRequestNo)),
      projectFundCode: sharedValue(itemGroup.batches.map((batch) => batch.projectFundCode)),
    };
  });
}

const STOCK_LOCATION_TAG = 'Login Location';

export default function StockLedgerReport() {
  const { t } = useTranslation();
  const locations = useLocations(STOCK_LOCATION_TAG);
  const [locationUuid, setLocationUuid] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [viewMode, setViewMode] = useState<'table' | 'graph' | 'trend'>('table');
  const [trendItemKey, setTrendItemKey] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const compare = useMonthComparison();
  const showLocationColumn = !locationUuid;

  const primaryStartDate = compare.enabled ? compare.primary.startDate : appliedDates.startDate;
  const primaryEndDate = compare.enabled ? compare.primary.endDate : appliedDates.endDate;

  const { rows: rawRows, isLoading } = useStockLedgerReport(primaryStartDate, primaryEndDate, locationUuid || undefined);
  const { rows: compareRawRows, isLoading: compareLoading } = useStockLedgerReport(
    compare.comparison.startDate,
    compare.comparison.endDate,
    locationUuid || undefined,
    compare.enabled,
  );
  const dataLoading = isLoading || (compare.enabled && compareLoading);

  const itemOptions = useMemo(
    () => Array.from(new Set(rawRows.map((row) => row.itemName))).sort((a, b) => a.localeCompare(b)),
    [rawRows],
  );

  const rows = useMemo(() => filterRows(rawRows, itemFilter, searchText), [rawRows, itemFilter, searchText]);
  const compareRows = useMemo(
    () => filterRows(compareRawRows, itemFilter, searchText),
    [compareRawRows, itemFilter, searchText],
  );

  const items = useMemo(() => buildItemList(rows), [rows]);
  const dayBlocks = useMemo(() => buildDayBlocks(rows, items), [rows, items]);

  const compareItems = useMemo(() => buildItemList(compareRows), [compareRows]);
  const compareDayBlocks = useMemo(
    () => buildDayBlocks(compareRows, compareItems),
    [compareRows, compareItems],
  );

  const kpiItems = useMemo(() => {
    const latestBlock = dayBlocks[dayBlocks.length - 1];
    const totalRemaining = latestBlock ? latestBlock.cells.reduce((sum, cell) => sum + cell.remainingQty, 0) : 0;
    const items_ = [
      {
        // Counts distinct items (per location when locations are shown). items.length counts
        // batches, so an item received three times used to be reported here as three items.
        label: showLocationColumn ? t('itemLocationPairs', 'Item/Location Pairs') : t('itemsTracked', 'Items Tracked'),
        value: countItemLocationPairs(items),
      },
      { label: t('batchesTracked', 'Batches'), value: items.length },
      { label: t('daysInRange', 'Days in Range'), value: dayBlocks.length },
      { label: t('totalRemainingLatest', 'Total Remaining (latest)'), value: totalRemaining },
    ];
    if (!compare.enabled) {
      return items_;
    }
    const compareLatestBlock = compareDayBlocks[compareDayBlocks.length - 1];
    const compareTotalRemaining = compareLatestBlock
      ? compareLatestBlock.cells.reduce((sum, cell) => sum + cell.remainingQty, 0)
      : 0;
    const compareValues = [
      countItemLocationPairs(compareItems),
      compareItems.length,
      compareDayBlocks.length,
      compareTotalRemaining,
    ];
    return items_.map((item, index) => ({
      ...item,
      compareValue: compareValues[index],
      compareLabel: compare.comparison.label,
    }));
  }, [t, items, dayBlocks, compareItems, compareDayBlocks, compare.enabled, compare.comparison.label, showLocationColumn]);

  const comparisonTableRows = useMemo(() => {
    if (!compare.enabled) {
      return [];
    }
    const latestBlock = dayBlocks[dayBlocks.length - 1];
    const compareLatestBlock = compareDayBlocks[compareDayBlocks.length - 1];
    const currentByKey = new Map(
      (latestBlock?.cells ?? []).map((cell): [string, number] => [
        groupKey(cell.stockItemId, cell.locationId, cell.batchId),
        cell.remainingQty,
      ]),
    );
    const compareByKey = new Map(
      (compareLatestBlock?.cells ?? []).map((cell): [string, number] => [
        groupKey(cell.stockItemId, cell.locationId, cell.batchId),
        cell.remainingQty,
      ]),
    );
    const itemUnion = new Map<string, string>();
    items.forEach((item) =>
      itemUnion.set(
        item.key,
        groupLabel(item.itemName, item.locationName, item.batchNo, item.expirationDate, showLocationColumn),
      ),
    );
    compareItems.forEach((item) =>
      itemUnion.set(
        item.key,
        groupLabel(item.itemName, item.locationName, item.batchNo, item.expirationDate, showLocationColumn),
      ),
    );
    return Array.from(itemUnion.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({
        label,
        current: currentByKey.get(key) ?? 0,
        compare: compareByKey.get(key) ?? 0,
      }));
  }, [items, compareItems, dayBlocks, compareDayBlocks, compare.enabled, showLocationColumn]);

  const chartData = useMemo(() => {
    const latestBlock = dayBlocks[dayBlocks.length - 1];
    if (!latestBlock) {
      return [];
    }
    return latestBlock.cells.map((cell) => ({
      label: groupLabel(cell.itemName, cell.locationName, cell.batchNo, cell.expirationDate, showLocationColumn),
      value: cell.remainingQty,
    }));
  }, [dayBlocks, showLocationColumn]);

  const flatRows = useMemo(() => buildFlatRows(dayBlocks), [dayBlocks]);
  const groupedRows = useMemo(() => buildGroupedRows(items, flatRows), [items, flatRows]);
  const itemGroups = useMemo(() => buildItemGroups(groupedRows), [groupedRows]);

  const effectiveTrendItemKey = trendItemKey ?? items[0]?.key ?? null;

  const trendData = useMemo(() => {
    if (effectiveTrendItemKey === null) {
      return [];
    }
    return dayBlocks
      .map((block) => {
        const cell = block.cells.find(
          (c) => groupKey(c.stockItemId, c.locationId, c.batchId) === effectiveTrendItemKey,
        );
        return cell ? { date: block.date, value: cell.remainingQty } : null;
      })
      .filter((point): point is { date: string; value: number } => point !== null);
  }, [dayBlocks, effectiveTrendItemKey]);

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('stockLedger', 'Stock Ledger'),
      headers: [
        t('item', 'Item'),
        ...(showLocationColumn ? [t('location', 'Location')] : []),
        t('batchNo', 'Batch No'),
        t('expirationDate', 'Expiration Date'),
        t('date', 'Date'),
        t('openingBalance', 'Opening Balance'),
        t('outgoing', 'Outgoing'),
        t('balanceOnStock', 'Balance on Stock'),
        t('unit', 'Unit'),
        t('bulkUnit', 'Bulk Unit'),
        t('unitsPerBulk', 'Units per Bulk'),
        t('purchaseOrderNo', 'Purchase Order No'),
        t('purchaseRequestNo', 'Purchase Request No'),
        t('projectFundCode', 'Project Fund Code'),
      ],
      rows: flatRows.map((row) => [
        row.itemName,
        ...(showLocationColumn ? [row.locationName ?? ''] : []),
        row.batchNo ?? '',
        row.expirationDate ? formatExpirationDate(row.expirationDate) : '',
        row.ledgerDate,
        row.actualQty,
        row.outgoingQty,
        row.remainingQty,
        row.unitName ?? '',
        // The pack is carried as unit + factor rather than as a pre-divided figure, so the quantity
        // columns above stay numeric and summable in the spreadsheet.
        ...bulkExportCells(row.bulkUnitName, row.bulkFactor),
        row.purchaseOrderNo ?? '',
        row.purchaseRequestNo ?? '',
        row.projectFundCode ?? '',
      ]),
    }),
    [t, flatRows, showLocationColumn],
  );

  const exportExtraSheets = useMemo<Array<ExportSheet>>(() => {
    if (!compare.enabled) {
      return [];
    }
    return [
      buildComparisonExportSheet(
        comparisonTableRows,
        t('item', 'Item'),
        compare.primary.label,
        compare.comparison.label,
        t,
      ),
      buildKpiExportSheet(kpiItems, t),
    ];
  }, [t, compare.enabled, comparisonTableRows, compare.primary.label, compare.comparison.label, kpiItems]);

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  function toggle(setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedItems(new Set(itemGroups.map((itemGroup) => itemGroup.key)));
    setExpandedBatches(new Set(groupedRows.map((group) => group.key)));
  }

  function collapseAll() {
    setExpandedItems(new Set());
    setExpandedBatches(new Set());
  }

  return (
    <div>
      <BackToReportsLink to="stock-reports-home" label={t('stockReports', 'Stock Reports')} />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('stockLedgerReportTitle', 'Stock Inventory Ledger Report')}</h2>

        {!dataLoading && <KpiTiles items={kpiItems} />}

        {!dataLoading && compare.enabled && (
          <>
            <h3 className={pageStyles.pageHeading}>
              {t(
                'itemComparisonHeading',
                'Item comparison (latest remaining): {{primary}} vs {{comparison}}',
                { primary: compare.primary.label, comparison: compare.comparison.label },
              )}
            </h3>
            <ComparisonSummaryTable
              rows={comparisonTableRows}
              rowLabel={t('item', 'Item')}
              currentLabel={compare.primary.label}
              compareLabel={compare.comparison.label}
              emptyMessage={t('noDataForEitherPeriod', 'No data found for either period.')}
            />
          </>
        )}

        <MonthCompareControls {...compare} />

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('searchByItemOrLocation', 'Search by item or location')}
              placeholder={t('searchByItemOrLocationPlaceholder', 'Search by item or location...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onClear={() => setSearchText('')}
            />
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="itemFilter"
              labelText={t('item', 'Item')}
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
            >
              <SelectItem value="" text={t('allItems', 'All items')} />
              {itemOptions.map((itemName) => (
                <React.Fragment key={itemName}>
                  <SelectItem value={itemName} text={itemName} />
                </React.Fragment>
              ))}
            </Select>
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="locationFilter"
              labelText={t('location', 'Location')}
              value={locationUuid}
              onChange={(e) => setLocationUuid(e.target.value)}
            >
              <SelectItem value="" text={t('allLocations', 'All locations')} />
              {locations?.map((location) => (
                <React.Fragment key={location.uuid}>
                  <SelectItem value={location.uuid} text={location.display} />
                </React.Fragment>
              ))}
            </Select>
          </div>
        </div>

        {!compare.enabled && (
          <div className={pageStyles.filterTile}>
            <div className={pageStyles.filterField}>
              <label htmlFor="startDate">{t('startDate', 'Start Date')}</label>
              <input
                id="startDate"
                type="date"
                value={startDateInput}
                max={getTodayDateString()}
                onChange={(e) => setStartDateInput(clampToToday(e.target.value))}
              />
            </div>
            <div className={pageStyles.filterField}>
              <label htmlFor="endDate">{t('endDate', 'End Date')}</label>
              <input
                id="endDate"
                type="date"
                value={endDateInput}
                max={getTodayDateString()}
                onChange={(e) => setEndDateInput(clampToToday(e.target.value))}
              />
            </div>
            <Button size="md" onClick={applyFilter}>
              {t('filter', 'Filter')}
            </Button>
          </div>
        )}

        <ExportButtons
          filenameBase="stock-ledger-report"
          mainSheet={mainExportSheet}
          extraSheets={exportExtraSheets}
          disabled={dataLoading}
        />

        <div className={pageStyles.viewSwitcher}>
          <ContentSwitcher
            size="md"
            selectedIndex={viewMode === 'table' ? 0 : viewMode === 'graph' ? 1 : 2}
            onChange={({ name }) => setViewMode(name as 'table' | 'graph' | 'trend')}
          >
            <Switch name="table" text={t('table', 'Table')} />
            <Switch name="graph" text={t('graphLatestRemaining', 'Graph (latest remaining)')} />
            <Switch name="trend" text={t('trendByItem', 'Trend (by item)')} />
          </ContentSwitcher>
        </div>

        {dataLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!dataLoading && viewMode === 'table' && itemGroups.length > 0 && (
          <div className={pageStyles.tableActions}>
            <Button kind="ghost" size="sm" onClick={expandAll}>
              {t('expandAll', 'Expand all')}
            </Button>
            <Button kind="ghost" size="sm" onClick={collapseAll}>
              {t('collapseAll', 'Collapse all')}
            </Button>
          </div>
        )}

        {!dataLoading && viewMode === 'table' && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th className="left">{t('item', 'Item')}</th>
                  {showLocationColumn && <th className="left">{t('location', 'Location')}</th>}
                  <th className="left">{t('batchNo', 'Batch No')}</th>
                  <th className="left">{t('expirationDate', 'Expiration Date')}</th>
                  <th className="left">{t('date', 'Date')}</th>
                  <th>{t('openingBalance', 'Opening Balance')}</th>
                  <th>{t('outgoing', 'Outgoing')}</th>
                  <th>{t('balanceOnStock', 'Balance on Stock')}</th>
                  <th className="left">{t('purchaseOrderNo', 'Purchase Order No')}</th>
                  <th className="left">{t('purchaseRequestNo', 'Purchase Request No')}</th>
                  <th className="left">{t('projectFundCode', 'Project Fund Code')}</th>
                </tr>
              </thead>
              <tbody>
                {itemGroups.map((itemGroup) => {
                  const itemExpanded = expandedItems.has(itemGroup.key);
                  return (
                    <React.Fragment key={itemGroup.key}>
                      <tr className={pageStyles.categoryHeaderRow} onClick={() => toggle(setExpandedItems, itemGroup.key)}>
                        <td colSpan={showLocationColumn ? 2 : 1} className="left">
                          <button className={pageStyles.collapseToggle} aria-expanded={itemExpanded}>
                            {itemExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {itemLocationLabel(itemGroup.itemName, itemGroup.locationName, showLocationColumn)} (
                            {itemGroup.dayCount === 1
                              ? t('oneDay', '1 day')
                              : t('nDays', '{{count}} days', { count: itemGroup.dayCount })}
                            )
                          </button>
                        </td>
                        <td className="left">
                          {itemGroup.batches.length === 1
                            ? t('oneBatch', '1 batch')
                            : t('nBatches', '{{count}} batches', { count: itemGroup.batches.length })}
                        </td>
                        <td className="left">{'—'}</td>
                        <td>{'—'}</td>
                        <td>
                          {formatQuantity(
                            itemGroup.openingBalance,
                            itemGroup.unitName,
                            itemGroup.bulkUnitName,
                            itemGroup.bulkFactor,
                          )}
                        </td>
                        <td>
                          {formatQuantity(
                            itemGroup.totalOutgoing,
                            itemGroup.unitName,
                            itemGroup.bulkUnitName,
                            itemGroup.bulkFactor,
                          )}
                        </td>
                        <td>
                          <strong>
                            {formatQuantity(
                              itemGroup.latestRemaining,
                              itemGroup.unitName,
                              itemGroup.bulkUnitName,
                              itemGroup.bulkFactor,
                            )}
                          </strong>
                        </td>
                        <td className="left">{itemGroup.purchaseOrderNo || '—'}</td>
                        <td className="left">{itemGroup.purchaseRequestNo || '—'}</td>
                        <td className="left">{itemGroup.projectFundCode || '—'}</td>
                      </tr>
                      {itemExpanded &&
                        itemGroup.batches.map((group) => {
                          const batchExpanded = expandedBatches.has(group.key);
                          const unitName = group.unitName;
                          const { bulkUnitName, bulkFactor } = group;
                          const duplicateBatchNo = group.batchNo !== null && itemGroup.duplicateBatchNos.has(group.batchNo);
                          return (
                            <React.Fragment key={group.key}>
                              <tr
                                className={pageStyles.subGroupRow}
                                onClick={() => toggle(setExpandedBatches, group.key)}
                              >
                                <td colSpan={showLocationColumn ? 2 : 1} className="left" />
                                <td className={`left ${pageStyles.nestedCell}`}>
                                  <button className={pageStyles.collapseToggle} aria-expanded={batchExpanded}>
                                    {batchExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    {group.batchNo ?? '—'}
                                  </button>
                                  {duplicateBatchNo && (
                                    <span
                                      className={pageStyles.duplicateTag}
                                      title={t(
                                        'duplicateBatchNoHelp',
                                        'Another lot of this item was received under the same batch number. They are held as separate lots because they differ in expiry or in the receipt that brought them in.',
                                      )}
                                    >
                                      {t('separateLot', 'separate lot')}
                                    </span>
                                  )}
                                </td>
                                <td className="left">{formatExpirationDate(group.expirationDate)}</td>
                                <td>{'—'}</td>
                                <td>{formatQuantity(group.openingBalance, unitName, bulkUnitName, bulkFactor)}</td>
                                <td>{formatQuantity(group.totalOutgoing, unitName, bulkUnitName, bulkFactor)}</td>
                                <td>
                                  <strong>
                                    {formatQuantity(group.latestRemaining, unitName, bulkUnitName, bulkFactor)}
                                  </strong>
                                </td>
                                <td className="left">{group.purchaseOrderNo || '—'}</td>
                                <td className="left">{group.purchaseRequestNo || '—'}</td>
                                <td className="left">{group.projectFundCode || '—'}</td>
                              </tr>
                              {batchExpanded &&
                                group.rows.map((row) => (
                                  <tr className={pageStyles.detailRow} key={`${group.key}-${row.ledgerDate}`}>
                                    <td className="left" />
                                    {showLocationColumn && <td className="left" />}
                                    <td className="left" />
                                    <td className="left" />
                                    <td className={`left ${pageStyles.nestedCell}`}>{row.ledgerDate}</td>
                                    <td>
                                      {formatQuantity(row.actualQty, row.unitName, row.bulkUnitName, row.bulkFactor)}
                                    </td>
                                    <td>
                                      {formatQuantity(row.outgoingQty, row.unitName, row.bulkUnitName, row.bulkFactor)}
                                    </td>
                                    <td>
                                      {formatQuantity(row.remainingQty, row.unitName, row.bulkUnitName, row.bulkFactor)}
                                    </td>
                                    <td className="left" />
                                    <td className="left" />
                                    <td className="left" />
                                  </tr>
                                ))}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
                {itemGroups.length === 0 && (
                  <tr>
                    <td colSpan={showLocationColumn ? 11 : 10} className={pageStyles.emptyState}>
                      {t('noDataForSelection', 'No data found for this selection.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!dataLoading && viewMode === 'graph' && (
          <SimpleBarChart data={chartData} emptyMessage={t('noDataForSelection', 'No data found for this selection.')} />
        )}

        {!dataLoading && viewMode === 'trend' && (
          <div>
            <div className={pageStyles.filterTile}>
              <div className={pageStyles.filterField}>
                <Select
                  id="trendItemFilter"
                  labelText={t('item', 'Item')}
                  value={effectiveTrendItemKey ?? ''}
                  onChange={(e) => setTrendItemKey(e.target.value)}
                >
                  {items.map((item) => (
                    <React.Fragment key={item.key}>
                      <SelectItem
                        value={item.key}
                        text={groupLabel(
                          item.itemName,
                          item.locationName,
                          item.batchNo,
                          item.expirationDate,
                          showLocationColumn,
                        )}
                      />
                    </React.Fragment>
                  ))}
                </Select>
              </div>
            </div>
            <SimpleLineChart data={trendData} emptyMessage={t('noDataForSelection', 'No data found for this selection.')} />
          </div>
        )}
      </div>
    </div>
  );
}
