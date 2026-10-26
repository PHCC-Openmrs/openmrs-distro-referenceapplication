import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, Search, Select, SelectItem, Tag } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import LocationFilter from '../reports-shell/location-filter.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import { bulkExportCells, formatQuantity } from '../reports-shell/format-quantity';
import { filterByItemAndSearch, distinctItemNames } from '../reports-shell/row-filter';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { useStockBatchBalanceReport, type StockBatchBalanceRow } from './stock-batch-balance.resource';

type ExpiryFilter = '' | 'expired' | 'notExpired' | 'noExpiry';

// A batch expiring today counts as expired, matching stock_current_onhand.sql's
// "expiration <= CURDATE()".
function isExpired(row: StockBatchBalanceRow): boolean {
  if (!row.expirationDate) {
    return false;
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  return parseDate(row.expirationDate).getTime() < startOfTomorrow.getTime();
}

function matchesExpiryFilter(row: StockBatchBalanceRow, filter: ExpiryFilter): boolean {
  switch (filter) {
    case 'expired':
      return isExpired(row);
    case 'notExpired':
      return !isExpired(row);
    case 'noExpiry':
      return !row.expirationDate;
    default:
      return true;
  }
}

function formatExpiry(expirationDate: string | null): string {
  return expirationDate ? formatDate(parseDate(expirationDate), { mode: 'standard', time: false }) : '';
}

export default function StockBatchBalanceReport() {
  const { t } = useTranslation();
  const [locationUuid, setLocationUuid] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('');

  const { rows: rawRows, isLoading } = useStockBatchBalanceReport(locationUuid || undefined);
  const showLocationColumn = !locationUuid;

  const itemOptions = useMemo(() => distinctItemNames(rawRows), [rawRows]);
  const rows = useMemo(
    () =>
      filterByItemAndSearch(rawRows, itemFilter, searchText).filter((row) => matchesExpiryFilter(row, expiryFilter)),
    [rawRows, itemFilter, searchText, expiryFilter],
  );

  const kpiItems = useMemo(
    () => [
      { label: t('batches', 'Batches'), value: rows.length },
      { label: t('items', 'Items'), value: distinctItemNames(rows).length },
      // Only batches still holding stock: an expired batch already used up needs no action.
      {
        label: t('expiredBatches', 'Already Expired'),
        value: rows.filter((row) => row.quantity > 0 && isExpired(row)).length,
      },
    ],
    [t, rows],
  );

  const sortAccessors = useMemo(
    () => ({
      item: (row: StockBatchBalanceRow) => row.itemName,
      location: (row: StockBatchBalanceRow) => row.locationName ?? '',
      batchNo: (row: StockBatchBalanceRow) => row.batchNo,
      expirationDate: (row: StockBatchBalanceRow) => row.expirationDate ?? '',
      quantity: (row: StockBatchBalanceRow) => row.quantity,
    }),
    [],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(rows, sortAccessors, 'item', 'asc');

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('stockBatchBalance', 'Batch Balance'),
      headers: [
        t('item', 'Item'),
        ...(showLocationColumn ? [t('location', 'Location')] : []),
        t('batchNo', 'Batch No'),
        t('expirationDate', 'Expiration Date'),
        t('quantityLeft', 'Quantity Left'),
        t('unit', 'Unit'),
        t('bulkUnit', 'Bulk Unit'),
        t('unitsPerBulk', 'Units per Bulk'),
      ],
      rows: sortedRows.map((row) => [
        row.itemName,
        ...(showLocationColumn ? [row.locationName ?? ''] : []),
        row.batchNo,
        formatExpiry(row.expirationDate),
        row.quantity,
        row.unitName ?? '',
        ...bulkExportCells(row.bulkUnitName, row.bulkFactor),
      ]),
    }),
    [t, sortedRows, showLocationColumn],
  );

  return (
    <div>
      <BackToReportsLink to="stock-reports-home" label={t('stockReports', 'Stock Reports')} />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('stockBatchBalanceReportTitle', 'Batch Balance Report')}</h2>

        {!isLoading && <KpiTiles items={kpiItems} />}

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
          <LocationFilter id="locationFilter" value={locationUuid} onChange={setLocationUuid} />
          <div className={pageStyles.filterField}>
            <Select
              id="expiryFilter"
              labelText={t('expiry', 'Expiry')}
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}
            >
              <SelectItem value="" text={t('allBatches', 'All batches')} />
              <SelectItem value="notExpired" text={t('notExpired', 'Not expired')} />
              <SelectItem value="expired" text={t('expired', 'Expired')} />
              <SelectItem value="noExpiry" text={t('noExpiryDate', 'No expiry date')} />
            </Select>
          </div>
        </div>

        <ExportButtons filenameBase="stock-batch-balance-report" mainSheet={mainExportSheet} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('item', 'Item')}
                    sortKey="item"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  {showLocationColumn && (
                    <SortableHeader
                      label={t('location', 'Location')}
                      sortKey="location"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      className="left"
                    />
                  )}
                  <SortableHeader
                    label={t('batchNo', 'Batch No')}
                    sortKey="batchNo"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('expirationDate', 'Expiration Date')}
                    sortKey="expirationDate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('quantityLeft', 'Quantity Left')}
                    sortKey="quantity"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th className="left">{t('status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={`${row.stockBatchId}-${row.locationId}`}>
                    <td className="left">{row.itemName}</td>
                    {showLocationColumn && <td className="left">{row.locationName ?? '—'}</td>}
                    <td className="left">{row.batchNo}</td>
                    <td className="left">{formatExpiry(row.expirationDate) || '—'}</td>
                    <td>{formatQuantity(row.quantity, row.unitName, row.bulkUnitName, row.bulkFactor)}</td>
                    <td className="left">
                      {isExpired(row) && (
                        <Tag type="red" size="sm">
                          {t('expired', 'Expired')}
                        </Tag>
                      )}
                      {row.quantity === 0 && (
                        <Tag type="gray" size="sm">
                          {t('emptyBatch', 'Empty')}
                        </Tag>
                      )}
                      {row.quantity < 0 && (
                        <Tag type="magenta" size="sm">
                          {t('negativeBalance', 'Negative balance')}
                        </Tag>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={showLocationColumn ? 6 : 5} className={pageStyles.emptyState}>
                      {t('noBatchesFound', 'No batches found for this selection.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
