import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, Search, Select, SelectItem, Tag } from '@carbon/react';
import { useLocations, formatDate, parseDate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { bulkExportCells, formatQuantity } from '../reports-shell/format-quantity';
import { filterByItemAndSearch, distinctItemNames } from '../reports-shell/row-filter';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { useStockAdjustmentsReport, type AdjustmentPurpose, type StockAdjustmentRow } from './stock-adjustments.resource';

const STOCK_LOCATION_TAG = 'Login Location';

type ItemTypeFilter = '' | 'drug' | 'other';

/** Signed, so an increase reads as "+30 Tablet" rather than being mistaken for a decrease. */
function signedQuantity(row: StockAdjustmentRow): string {
  const formatted = formatQuantity(Math.abs(row.quantity), row.unitName, row.bulkUnitName, row.bulkFactor);
  return `${row.quantity < 0 ? '-' : '+'}${formatted}`;
}

export default function StockAdjustmentsReport() {
  const { t } = useTranslation();
  const locations = useLocations(STOCK_LOCATION_TAG);
  const [locationUuid, setLocationUuid] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [itemFilter, setItemFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<'' | AdjustmentPurpose>('');
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('');
  const [reasonFilter, setReasonFilter] = useState('');

  const { rows: rawRows, isLoading } = useStockAdjustmentsReport(
    appliedDates.startDate,
    appliedDates.endDate,
    locationUuid || undefined,
  );
  const showLocationColumn = !locationUuid;

  const itemOptions = useMemo(() => distinctItemNames(rawRows), [rawRows]);
  // Taken from the rows in hand rather than fetched from the concept set, so the dropdown only ever
  // offers reasons that actually occur in the current selection.
  const reasonOptions = useMemo(
    () =>
      Array.from(new Set(rawRows.map((row) => row.reasonName).filter((name): name is string => !!name))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [rawRows],
  );

  const rows = useMemo(() => {
    let filtered = filterByItemAndSearch(rawRows, itemFilter, searchText);
    if (purposeFilter) {
      filtered = filtered.filter((row) => row.purpose === purposeFilter);
    }
    if (itemTypeFilter) {
      filtered = filtered.filter((row) => (itemTypeFilter === 'drug' ? !!row.isDrug : !row.isDrug));
    }
    if (reasonFilter) {
      filtered = filtered.filter((row) => row.reasonName === reasonFilter);
    }
    return filtered;
  }, [rawRows, itemFilter, searchText, purposeFilter, itemTypeFilter, reasonFilter]);

  const kpiItems = useMemo(() => {
    // Counts rather than summed quantities: a report spanning tablets, gloves and syringes has no
    // meaningful total quantity, the units not being commensurable.
    const operations = new Set(rows.map((row) => row.operationNumber).filter(Boolean)).size;
    return [
      { label: t('adjustmentLines', 'Adjustment Lines'), value: rows.length },
      { label: t('operations', 'Operations'), value: operations },
      {
        label: t('consumptionLines', 'Consumption Lines'),
        value: rows.filter((row) => row.purpose === 'CONSUMPTION').length,
      },
      {
        label: t('correctionLines', 'Correction Lines'),
        value: rows.filter((row) => row.purpose === 'CORRECTION').length,
      },
      { label: t('mismatchedLines', 'Mismatched'), value: rows.filter((row) => row.mismatched).length },
    ];
  }, [t, rows]);

  const sortAccessors = useMemo(
    () => ({
      operationDate: (row: StockAdjustmentRow) => row.operationDate,
      operationNumber: (row: StockAdjustmentRow) => row.operationNumber ?? '',
      item: (row: StockAdjustmentRow) => row.itemName,
      location: (row: StockAdjustmentRow) => row.locationName ?? '',
      itemType: (row: StockAdjustmentRow) => (row.isDrug ? 1 : 0),
      quantity: (row: StockAdjustmentRow) => row.quantity,
      purpose: (row: StockAdjustmentRow) => row.purpose,
      reason: (row: StockAdjustmentRow) => row.reasonName ?? '',
    }),
    [],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(
    rows,
    sortAccessors,
    'operationDate',
    'desc',
  );

  const purposeLabel = (purpose: AdjustmentPurpose) =>
    purpose === 'CONSUMPTION' ? t('consumption', 'Consumption') : t('correction', 'Correction');

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('stockAdjustments', 'Stock Adjustments'),
      headers: [
        t('date', 'Date'),
        t('operationNumber', 'Operation No'),
        ...(showLocationColumn ? [t('location', 'Location')] : []),
        t('item', 'Item'),
        t('itemType', 'Item Type'),
        t('batchNo', 'Batch No'),
        t('expirationDate', 'Expiration Date'),
        t('quantity', 'Quantity'),
        t('unit', 'Unit'),
        t('bulkUnit', 'Bulk Unit'),
        t('unitsPerBulk', 'Units per Bulk'),
        t('purpose', 'Purpose'),
        t('reason', 'Reason'),
        t('remarks', 'Remarks'),
        t('responsiblePerson', 'Responsible Person'),
        t('mismatched', 'Mismatched'),
      ],
      rows: rows.map((row) => [
        formatDate(parseDate(row.operationDate), { mode: 'standard', time: false }),
        row.operationNumber ?? '',
        ...(showLocationColumn ? [row.locationName ?? ''] : []),
        row.itemName,
        row.isDrug ? t('drug', 'Drug') : t('other', 'Other'),
        row.batchNo ?? '',
        row.expirationDate ? formatDate(parseDate(row.expirationDate), { mode: 'standard', time: false }) : '',
        // Left signed and numeric so the column stays summable per item in the spreadsheet.
        row.quantity,
        row.unitName ?? '',
        ...bulkExportCells(row.bulkUnitName, row.bulkFactor),
        purposeLabel(row.purpose),
        row.reasonName ?? '',
        row.remarks ?? '',
        row.responsiblePerson ?? '',
        row.mismatched ? t('yes', 'Yes') : t('no', 'No'),
      ]),
    }),
    [t, rows, showLocationColumn],
  );

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  const columnCount = showLocationColumn ? 12 : 11;

  return (
    <div>
      <BackToReportsLink to="stock-reports-home" label={t('stockReports', 'Stock Reports')} />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('stockAdjustmentsReportTitle', 'Stock Adjustments Report')}</h2>
        <p className={pageStyles.pageSubtitle}>
          {t(
            'stockAdjustmentsSubtitle',
            'Every completed stock adjustment line, with the reason and remarks recorded on the operation. Adjustments serve two purposes: drawing down a non-pharmacy commodity that has no dispensing workflow (Consumption), and correcting a miscount or data-entry error (Correction). Which reasons count as consumption is set by the labtestreport.adjustmentConsumptionReasonUuids global property.',
          )}
        </p>

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
          <div className={pageStyles.filterField}>
            <Select
              id="purposeFilter"
              labelText={t('purpose', 'Purpose')}
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value as '' | AdjustmentPurpose)}
            >
              <SelectItem value="" text={t('allPurposes', 'All purposes')} />
              <SelectItem value="CONSUMPTION" text={t('consumption', 'Consumption')} />
              <SelectItem value="CORRECTION" text={t('correction', 'Correction')} />
            </Select>
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="itemTypeFilter"
              labelText={t('itemType', 'Item Type')}
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value as ItemTypeFilter)}
            >
              <SelectItem value="" text={t('allItemTypes', 'All item types')} />
              <SelectItem value="drug" text={t('drug', 'Drug')} />
              <SelectItem value="other" text={t('other', 'Other')} />
            </Select>
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="reasonFilter"
              labelText={t('reason', 'Reason')}
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <SelectItem value="" text={t('allReasons', 'All reasons')} />
              {reasonOptions.map((reason) => (
                <React.Fragment key={reason}>
                  <SelectItem value={reason} text={reason} />
                </React.Fragment>
              ))}
            </Select>
          </div>
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

        <ExportButtons filenameBase="stock-adjustments-report" mainSheet={mainExportSheet} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('date', 'Date')}
                    sortKey="operationDate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('operationNumber', 'Operation No')}
                    sortKey="operationNumber"
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
                    label={t('item', 'Item')}
                    sortKey="item"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('itemType', 'Item Type')}
                    sortKey="itemType"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('batchNo', 'Batch No')}</th>
                  <th className="left">{t('expirationDate', 'Expiration Date')}</th>
                  <SortableHeader
                    label={t('quantity', 'Quantity')}
                    sortKey="quantity"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('purpose', 'Purpose')}
                    sortKey="purpose"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('reason', 'Reason')}
                    sortKey="reason"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('remarks', 'Remarks')}</th>
                  <th className="left">{t('responsiblePerson', 'Responsible Person')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={`${row.operationNumber}-${row.stockItemId}-${row.batchNo}-${index}`}>
                    <td className="left">{formatDate(parseDate(row.operationDate), { mode: 'standard', time: false })}</td>
                    <td className="left">{row.operationNumber ?? '—'}</td>
                    {showLocationColumn && <td className="left">{row.locationName ?? '—'}</td>}
                    <td className="left">{row.itemName}</td>
                    <td className="left">
                      <Tag type={row.isDrug ? 'blue' : 'gray'} size="sm">
                        {row.isDrug ? t('drug', 'Drug') : t('other', 'Other')}
                      </Tag>
                    </td>
                    <td className="left">{row.batchNo ?? '—'}</td>
                    <td className="left">
                      {row.expirationDate
                        ? formatDate(parseDate(row.expirationDate), { mode: 'standard', time: false })
                        : '—'}
                    </td>
                    <td>{signedQuantity(row)}</td>
                    <td className="left">
                      <Tag type={row.purpose === 'CONSUMPTION' ? 'teal' : 'purple'} size="sm">
                        {purposeLabel(row.purpose)}
                      </Tag>
                      {row.mismatched && (
                        <span
                          title={t(
                            'mismatchedHint',
                            'The reason chosen does not match the item type - a drug recorded as consumption, or a commodity recorded as a correction.',
                          )}
                        >
                          <Tag type="red" size="sm">
                            {t('mismatched', 'Mismatched')}
                          </Tag>
                        </span>
                      )}
                    </td>
                    <td className="left">{row.reasonName ?? '—'}</td>
                    <td className="left">{row.remarks ?? '—'}</td>
                    <td className="left">{row.responsiblePerson ?? '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columnCount} className={pageStyles.emptyState}>
                      {t(
                        'noAdjustmentsFound',
                        'No completed stock adjustments for this selection. Adjustments only appear here once the operation has been completed.',
                      )}
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
