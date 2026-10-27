import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox, InlineLoading, Select, SelectItem, Tag } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import LocationFilter from '../reports-shell/location-filter.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { bulkExportCells, formatQuantity } from '../reports-shell/format-quantity';
import pageStyles from '../reports-shell/reports-page.scss';
import { useStockBatchBalanceReport } from '../stock-batch-balance/stock-batch-balance.resource';
import { useStockBatchHistoryReport, type StockBatchHistoryRow } from './stock-batch-history.resource';

// Column order of the summary table, and the order activities read in: what came in, what went
// out, then the corrections. Activities not in this list (a future operation type) go last.
const ACTIVITY_ORDER = [
  'OPENING_STOCK',
  'RECEIVED',
  'TRANSFERRED_IN',
  'ISSUE_RECEIVED',
  'RETURN_RECEIVED',
  'DISPENSED',
  'ISSUED',
  'TRANSFERRED_OUT',
  'RETURNED',
  'DISPOSED',
  'ADJUSTED',
  'STOCK_TAKE',
];

// Adjustments and stock takes go either way, so their summary column is a signed net figure; every
// other activity only ever moves stock in one direction and is shown as a plain amount.
const SIGNED_ACTIVITIES = new Set(['ADJUSTED', 'STOCK_TAKE']);

type TagType = 'green' | 'teal' | 'blue' | 'purple' | 'red' | 'gray' | 'cyan' | 'magenta';

const ACTIVITY_TAG_TYPE: Record<string, TagType> = {
  OPENING_STOCK: 'green',
  RECEIVED: 'green',
  TRANSFERRED_IN: 'teal',
  ISSUE_RECEIVED: 'teal',
  RETURN_RECEIVED: 'teal',
  DISPENSED: 'blue',
  ISSUED: 'cyan',
  TRANSFERRED_OUT: 'purple',
  RETURNED: 'magenta',
  DISPOSED: 'red',
  ADJUSTED: 'gray',
  STOCK_TAKE: 'gray',
};

function activityRank(activity: string): number {
  const index = ACTIVITY_ORDER.indexOf(activity);
  return index === -1 ? ACTIVITY_ORDER.length : index;
}

/** A movement together with what its location held of that batch straight after it. */
interface HistoryEntry {
  row: StockBatchHistoryRow;
  balanceAfter: number;
}

interface LocationSummary {
  key: string;
  batchNo: string;
  expirationDate: string | null;
  locationName: string | null;
  opening: number;
  byActivity: Map<string, number>;
  closing: number;
}

function batchLocationKey(row: StockBatchHistoryRow): string {
  return `${row.stockBatchId}-${row.locationId}`;
}

function formatDay(value: string | null): string {
  return value ? formatDate(parseDate(value), { mode: 'standard', time: false }) : '';
}

function readInitialSelection(): { stockItemId?: number; stockBatchId?: number } {
  const params = new URLSearchParams(window.location.search);
  return {
    stockItemId: Number(params.get('stockItemId')) || undefined,
    stockBatchId: Number(params.get('stockBatchId')) || undefined,
  };
}

export default function StockBatchHistoryReport() {
  const { t } = useTranslation();
  const [initialSelection] = useState(readInitialSelection);
  const [stockItemId, setStockItemId] = useState<number | undefined>(initialSelection.stockItemId);
  const [stockBatchId, setStockBatchId] = useState<number | undefined>(initialSelection.stockBatchId);
  const [locationUuid, setLocationUuid] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});

  // The item and batch pickers are fed from the batch-balance endpoint, which lists every batch
  // that has had a completed movement anywhere - exactly the batches that have a history to show.
  const { rows: balanceRows, isLoading: optionsLoading } = useStockBatchBalanceReport();
  const { rows, isLoading } = useStockBatchHistoryReport(stockItemId, stockBatchId);

  const itemOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string }>();
    balanceRows.forEach((row) => byId.set(row.stockItemId, { id: row.stockItemId, name: row.itemName }));
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [balanceRows]);
  const selectedItem = itemOptions.find((item) => item.id === stockItemId) ?? null;

  const batchOptions = useMemo(() => {
    const byId = new Map<number, { id: number; batchNo: string; expirationDate: string | null }>();
    balanceRows
      .filter((row) => row.stockItemId === stockItemId)
      .forEach((row) =>
        byId.set(row.stockBatchId, { id: row.stockBatchId, batchNo: row.batchNo, expirationDate: row.expirationDate }),
      );
    return Array.from(byId.values()).sort((a, b) => a.batchNo.localeCompare(b.batchNo));
  }, [balanceRows, stockItemId]);

  const showBatchColumn = !stockBatchId;
  const showLocationColumn = !locationUuid;
  const { startDate, endDate } = appliedDates;

  // Running balances are worked out over the whole history, before the date range is applied, so
  // the balance shown against the first in-range movement already includes everything earlier.
  const entries = useMemo<Array<HistoryEntry>>(() => {
    const balances = new Map<string, number>();
    return rows
      .filter((row) => !locationUuid || row.locationUuid === locationUuid)
      .map((row) => {
        const key = batchLocationKey(row);
        const balanceAfter = (balances.get(key) ?? 0) + row.quantity;
        balances.set(key, balanceAfter);
        return { row, balanceAfter };
      });
  }, [rows, locationUuid]);

  const inRangeEntries = useMemo(
    () =>
      entries.filter(
        ({ row }) => (!startDate || row.operationDate >= startDate) && (!endDate || row.operationDate <= endDate),
      ),
    [entries, startDate, endDate],
  );

  const summaries = useMemo<Array<LocationSummary>>(() => {
    const byKey = new Map<string, LocationSummary>();
    entries.forEach(({ row }) => {
      if (endDate && row.operationDate > endDate) {
        return;
      }
      const key = batchLocationKey(row);
      let summary = byKey.get(key);
      if (!summary) {
        summary = {
          key,
          batchNo: row.batchNo,
          expirationDate: row.expirationDate,
          locationName: row.locationName,
          opening: 0,
          byActivity: new Map(),
          closing: 0,
        };
        byKey.set(key, summary);
      }
      summary.closing += row.quantity;
      if (startDate && row.operationDate < startDate) {
        summary.opening += row.quantity;
        return;
      }
      const amount = SIGNED_ACTIVITIES.has(row.activity) ? row.quantity : Math.abs(row.quantity);
      summary.byActivity.set(row.activity, (summary.byActivity.get(row.activity) ?? 0) + amount);
    });
    return Array.from(byKey.values()).sort(
      (a, b) => a.batchNo.localeCompare(b.batchNo) || (a.locationName ?? '').localeCompare(b.locationName ?? ''),
    );
  }, [entries, startDate, endDate]);

  // Only the activities that actually happened get a column, so a batch that was simply received
  // and dispensed reads as a short table rather than a wall of zeros.
  const summaryActivities = useMemo(() => {
    const present = new Set<string>();
    summaries.forEach((summary) => summary.byActivity.forEach((_, activity) => present.add(activity)));
    return Array.from(present).sort((a, b) => activityRank(a) - activityRank(b) || a.localeCompare(b));
  }, [summaries]);

  // Every row of one item shares its units, so the first row's are good for any total.
  const unitRow = rows[0];
  const qty = useCallback(
    (value: number) =>
      formatQuantity(value, unitRow?.unitName, unitRow?.bulkUnitName ?? null, unitRow?.bulkFactor ?? null),
    [unitRow],
  );
  const signedQty = useCallback(
    (value: number) => `${value < 0 ? '-' : value > 0 ? '+' : ''}${qty(Math.abs(value))}`,
    [qty],
  );

  const activityLabel = useCallback(
    (activity: string): string => {
      switch (activity) {
        case 'OPENING_STOCK':
          return t('batchActivityOpeningStock', 'Opening Stock');
        case 'RECEIVED':
          return t('batchActivityReceived', 'Received');
        case 'TRANSFERRED_IN':
          return t('batchActivityTransferredIn', 'Transferred In');
        case 'ISSUE_RECEIVED':
          return t('batchActivityIssueReceived', 'Received from Issue');
        case 'RETURN_RECEIVED':
          return t('batchActivityReturnReceived', 'Return Received');
        case 'DISPENSED':
          return t('batchActivityDispensed', 'Dispensed');
        case 'ISSUED':
          return t('batchActivityIssued', 'Issued');
        case 'TRANSFERRED_OUT':
          return t('batchActivityTransferredOut', 'Transferred Out');
        case 'RETURNED':
          return t('batchActivityReturned', 'Returned');
        case 'DISPOSED':
          return t('batchActivityDisposed', 'Disposed');
        case 'ADJUSTED':
          return t('batchActivityAdjusted', 'Adjusted');
        case 'STOCK_TAKE':
          return t('batchActivityStockTake', 'Stock Take');
        default:
          return activity;
      }
    },
    [t],
  );

  /** Who or where the stock went to, or came from. */
  const counterpartLabel = useCallback(
    (row: StockBatchHistoryRow): string => {
      if (row.activity === 'DISPENSED') {
        return row.patientName ?? '';
      }
      if (!row.counterpartName) {
        return '';
      }
      return row.quantity < 0
        ? t('toCounterpart', 'To {{name}}', { name: row.counterpartName })
        : t('fromCounterpart', 'From {{name}}', { name: row.counterpartName });
    },
    [t],
  );

  function batchLabel(batchNo: string, expirationDate: string | null): string {
    return expirationDate
      ? t('batchWithExpiry', '{{batchNo}} (exp. {{expiry}})', { batchNo, expiry: formatDay(expirationDate) })
      : batchNo;
  }

  const kpiItems = useMemo(() => {
    const total = (activities: Array<string>) =>
      summaries.reduce(
        (sum, summary) => sum + activities.reduce((s, activity) => s + (summary.byActivity.get(activity) ?? 0), 0),
        0,
      );
    const closing = summaries.reduce((sum, summary) => sum + summary.closing, 0);
    return [
      { label: t('received', 'Received'), value: qty(total(['OPENING_STOCK', 'RECEIVED'])) },
      { label: t('batchActivityDispensed', 'Dispensed'), value: qty(total(['DISPENSED'])) },
      { label: t('batchActivityTransferredOut', 'Transferred Out'), value: qty(total(['TRANSFERRED_OUT'])) },
      { label: t('batchActivityDisposed', 'Disposed'), value: qty(total(['DISPOSED'])) },
      { label: t('netAdjustments', 'Net Adjustments'), value: signedQty(total(['ADJUSTED', 'STOCK_TAKE'])) },
      {
        label: endDate ? t('balanceAtEndDate', 'Balance at End Date') : t('currentBalance', 'Current Balance'),
        value: qty(closing),
      },
    ];
  }, [t, summaries, endDate, qty, signedQty]);

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('batchMovements', 'Batch Movements'),
      headers: [
        t('date', 'Date'),
        t('item', 'Item'),
        t('batchNo', 'Batch No'),
        t('expirationDate', 'Expiration Date'),
        t('location', 'Location'),
        t('activity', 'Activity'),
        t('fromTo', 'From / To'),
        t('quantityIn', 'Quantity In'),
        t('quantityOut', 'Quantity Out'),
        t('balanceAtLocation', 'Balance at Location'),
        t('unit', 'Unit'),
        t('bulkUnit', 'Bulk Unit'),
        t('unitsPerBulk', 'Units per Bulk'),
        t('operationNumber', 'Operation No'),
        t('reason', 'Reason'),
        t('recordedBy', 'Recorded By'),
      ],
      rows: inRangeEntries.map(({ row, balanceAfter }) => [
        formatDay(row.operationDate),
        row.itemName,
        row.batchNo,
        formatDay(row.expirationDate),
        row.locationName ?? '',
        activityLabel(row.activity),
        counterpartLabel(row),
        row.quantity > 0 ? row.quantity : '',
        row.quantity < 0 ? -row.quantity : '',
        balanceAfter,
        row.unitName ?? '',
        ...bulkExportCells(row.bulkUnitName, row.bulkFactor),
        row.operationNumber ?? '',
        row.reasonName ?? '',
        row.recordedBy ?? '',
      ]),
    }),
    [t, inRangeEntries, activityLabel, counterpartLabel],
  );

  const summaryExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('batchSummary', 'Summary by Location'),
      headers: [
        t('batchNo', 'Batch No'),
        t('expirationDate', 'Expiration Date'),
        t('location', 'Location'),
        ...(startDate ? [t('openingBalance', 'Opening Balance')] : []),
        ...summaryActivities.map((activity) => activityLabel(activity)),
        t('balance', 'Balance'),
        t('unit', 'Unit'),
      ],
      rows: summaries.map((summary) => [
        summary.batchNo,
        formatDay(summary.expirationDate),
        summary.locationName ?? '',
        ...(startDate ? [summary.opening] : []),
        ...summaryActivities.map((activity) => summary.byActivity.get(activity) ?? 0),
        summary.closing,
        unitRow?.unitName ?? '',
      ]),
    }),
    [t, summaries, summaryActivities, startDate, unitRow, activityLabel],
  );

  function selectItem(id: number | undefined) {
    setStockItemId(id);
    setStockBatchId(undefined);
  }

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  const detailColumnCount = 9 + (showBatchColumn ? 1 : 0) + (showLocationColumn ? 1 : 0);
  const summaryColumnCount = 3 + (startDate ? 1 : 0) + summaryActivities.length;

  return (
    <div>
      <BackToReportsLink to="stock-reports-home" label={t('stockReports', 'Stock Reports')} />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('stockBatchHistoryReportTitle', 'Batch History Report')}</h2>
        <p className={pageStyles.pageSubtitle}>
          {t(
            'stockBatchHistorySubtitle',
            'Everything that happened to a batch, location by location: what was received, transferred, issued, dispensed, disposed of and adjusted, and what is left. Only completed operations are counted.',
          )}
        </p>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField} style={{ minWidth: '18rem' }}>
            <ComboBox
              id="itemFilter"
              titleText={t('item', 'Item')}
              placeholder={optionsLoading ? t('loading', 'Loading...') : t('chooseItem', 'Choose an item')}
              items={itemOptions}
              itemToString={(item) => item?.name ?? ''}
              selectedItem={selectedItem}
              onChange={({ selectedItem: item }) => selectItem(item?.id)}
            />
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="batchFilter"
              labelText={t('batch', 'Batch')}
              value={stockBatchId ?? ''}
              disabled={!stockItemId}
              onChange={(e) => setStockBatchId(Number(e.target.value) || undefined)}
            >
              <SelectItem value="" text={t('allBatches', 'All batches')} />
              {batchOptions.map((batch) => (
                <React.Fragment key={batch.id}>
                  <SelectItem value={batch.id} text={batchLabel(batch.batchNo, batch.expirationDate)} />
                </React.Fragment>
              ))}
            </Select>
          </div>
          <LocationFilter id="locationFilter" value={locationUuid} onChange={setLocationUuid} />
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

        {!stockItemId && (
          <p className={pageStyles.emptyState}>
            {t('chooseItemForBatchHistory', 'Choose an item to see what happened to its batches.')}
          </p>
        )}

        {stockItemId && isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {stockItemId && !isLoading && (
          <>
            <KpiTiles items={kpiItems} />

            <ExportButtons
              filenameBase="stock-batch-history-report"
              mainSheet={mainExportSheet}
              extraSheets={[summaryExportSheet]}
            />

            <h3 className={pageStyles.pageHeading}>{t('batchSummary', 'Summary by Location')}</h3>
            <div className={pageStyles.tableContainer}>
              <table className={pageStyles.dataTable}>
                <thead>
                  <tr>
                    <th className="left">{t('batchNo', 'Batch No')}</th>
                    <th className="left">{t('location', 'Location')}</th>
                    {startDate && <th>{t('openingBalance', 'Opening Balance')}</th>}
                    {summaryActivities.map((activity) => (
                      <th key={activity}>{activityLabel(activity)}</th>
                    ))}
                    <th>{t('balance', 'Balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((summary) => (
                    <tr key={summary.key}>
                      <td className="left">{batchLabel(summary.batchNo, summary.expirationDate)}</td>
                      <td className="left">{summary.locationName ?? '—'}</td>
                      {startDate && <td>{qty(summary.opening)}</td>}
                      {summaryActivities.map((activity) => {
                        const value = summary.byActivity.get(activity);
                        return (
                          <td key={activity}>
                            {value === undefined ? '—' : SIGNED_ACTIVITIES.has(activity) ? signedQty(value) : qty(value)}
                          </td>
                        );
                      })}
                      <td>
                        <strong>{qty(summary.closing)}</strong>
                      </td>
                    </tr>
                  ))}
                  {summaries.length === 0 && (
                    <tr>
                      <td colSpan={summaryColumnCount} className={pageStyles.emptyState}>
                        {t('noBatchMovementsFound', 'No movements found for this selection.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className={pageStyles.pageHeading}>{t('batchMovements', 'Batch Movements')}</h3>
            <div className={pageStyles.tableContainer}>
              <table className={pageStyles.dataTable}>
                <thead>
                  <tr>
                    <th className="left">{t('date', 'Date')}</th>
                    {showBatchColumn && <th className="left">{t('batchNo', 'Batch No')}</th>}
                    {showLocationColumn && <th className="left">{t('location', 'Location')}</th>}
                    <th className="left">{t('activity', 'Activity')}</th>
                    <th className="left">{t('fromTo', 'From / To')}</th>
                    <th>{t('quantityIn', 'Quantity In')}</th>
                    <th>{t('quantityOut', 'Quantity Out')}</th>
                    <th>{t('balanceAtLocation', 'Balance at Location')}</th>
                    <th className="left">{t('operationNumber', 'Operation No')}</th>
                    <th className="left">{t('reason', 'Reason')}</th>
                    <th className="left">{t('recordedBy', 'Recorded By')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inRangeEntries.map(({ row, balanceAfter }) => (
                    <tr key={row.transactionId}>
                      <td className="left">{formatDay(row.operationDate)}</td>
                      {showBatchColumn && <td className="left">{row.batchNo}</td>}
                      {showLocationColumn && <td className="left">{row.locationName ?? '—'}</td>}
                      <td className="left">
                        <Tag type={ACTIVITY_TAG_TYPE[row.activity] ?? 'gray'} size="sm">
                          {activityLabel(row.activity)}
                        </Tag>
                      </td>
                      <td className="left">{counterpartLabel(row) || '—'}</td>
                      <td>{row.quantity > 0 ? qty(row.quantity) : ''}</td>
                      <td>{row.quantity < 0 ? qty(-row.quantity) : ''}</td>
                      <td>{qty(balanceAfter)}</td>
                      <td className="left">{row.operationNumber ?? '—'}</td>
                      <td className="left">{row.reasonName ?? ''}</td>
                      <td className="left">{row.recordedBy ?? ''}</td>
                    </tr>
                  ))}
                  {inRangeEntries.length === 0 && (
                    <tr>
                      <td colSpan={detailColumnCount} className={pageStyles.emptyState}>
                        {t('noBatchMovementsFound', 'No movements found for this selection.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
