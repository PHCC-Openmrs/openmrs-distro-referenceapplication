import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  InlineLoading,
  Button,
  Checkbox,
  ContentSwitcher,
  Switch,
  Search,
} from '@carbon/react';
import { ChevronDown, ChevronRight } from '@carbon/react/icons';
import { navigate, useLocations } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import SimpleBarChart from '../reports-shell/simple-bar-chart.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import MonthCompareControls from '../reports-shell/month-compare-controls.component';
import ComparisonSummaryTable from '../reports-shell/comparison-summary-table.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import LocationFilter from '../reports-shell/location-filter.component';
import { buildKpiExportSheet, buildComparisonExportSheet, type ExportSheet } from '../reports-shell/export-utils';
import { useMonthComparison } from '../reports-shell/month-compare';
import pageStyles from '../reports-shell/reports-page.scss';
import styles from './disease-summary.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import {
  useDiseaseSummaryReport,
  useDiseaseDrilldown,
  type DiseaseActivityRow,
  type DiseaseDrilldownParams,
} from './disease-summary.resource';

const AGE_GROUPS = ['0-4', '5-14', '15-18', '19-49', '50-65', '65+'];
const AGE_GENDER_COLUMNS = AGE_GROUPS.flatMap((ageGroup) => [
  { key: `${ageGroup}_M`, ageGroup, genderCode: 'M', gender: 'Male' },
  { key: `${ageGroup}_F`, ageGroup, genderCode: 'F', gender: 'Female' },
]);
type AgeGenderColumn = (typeof AGE_GENDER_COLUMNS)[number];

// Must match the row keys in the backend's DiseaseActivityLayout.
const TOTAL_DISEASES_KEY = 'totalDiseases';
const DISEASES_GROUP = 'Diseases';
const NOT_CAPTURED = '—';
const LOCATION_TAG = 'Login Location';

interface Selection extends DiseaseDrilldownParams {
  label: string;
  cellLabel?: string;
}

/** One table line: a section band or a report row. */
type DisplayLine =
  | { type: 'section'; section: string; total: number; rowCount: number }
  | { type: 'row'; row: DiseaseActivityRow };

/** Case totals per disease section (e.g. RESPIRATORY DISEASES), from the rows that count towards Total Diseases. */
function summarizeSections(rows: Array<DiseaseActivityRow>) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    if (row.group === DISEASES_GROUP && row.section && row.kind === 'DIAGNOSIS') {
      totals.set(row.section, (totals.get(row.section) ?? 0) + row.total);
    }
  });
  return totals;
}

function topEntry(entries: Array<[string, number]>): [string, number] | null {
  return entries.reduce<[string, number] | null>((top, entry) => (!top || entry[1] > top[1] ? entry : top), null);
}

function summarize(rows: Array<DiseaseActivityRow>) {
  const sectionTotals = summarizeSections(rows);
  const diagnosisRows = rows.filter((row) => row.kind === 'DIAGNOSIS');
  return {
    sectionTotals,
    totalDiseases: rows.find((row) => row.rowKey === TOTAL_DISEASES_KEY)?.total ?? 0,
    topSection: topEntry(Array.from(sectionTotals.entries()).filter(([, total]) => total > 0)),
    topRow: topEntry(diagnosisRows.filter((row) => row.total > 0).map((row): [string, number] => [row.label, row.total])),
  };
}

export default function DiseaseSummaryReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [diagnosisListRow, setDiagnosisListRow] = useState<DiseaseActivityRow | null>(null);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [locationUuid, setLocationUuid] = useState('');
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const compare = useMonthComparison();
  const locations = useLocations(LOCATION_TAG);

  const primaryStartDate = compare.enabled ? compare.primary.startDate : appliedDates.startDate;
  const primaryEndDate = compare.enabled ? compare.primary.endDate : appliedDates.endDate;

  const { rows, isLoading } = useDiseaseSummaryReport(
    primaryStartDate,
    primaryEndDate,
    locationUuid || undefined,
  );
  const { rows: compareRows, isLoading: compareLoading } = useDiseaseSummaryReport(
    compare.comparison.startDate,
    compare.comparison.endDate,
    locationUuid || undefined,
    compare.enabled,
  );
  const { patients, isLoading: patientsLoading } = useDiseaseDrilldown(selection);
  const dataLoading = isLoading || (compare.enabled && compareLoading);

  const siteName = locationUuid
    ? locations?.find((location) => location.uuid === locationUuid)?.display ?? ''
    : t('allLocations', 'All locations');
  const periodLabel = compare.enabled
    ? compare.primary.label
    : primaryStartDate || primaryEndDate
      ? `${primaryStartDate ?? '…'} – ${primaryEndDate ?? '…'}`
      : t('allDates', 'All dates');

  const primary = useMemo(() => summarize(rows), [rows]);
  const compareSummary = useMemo(() => (compare.enabled ? summarize(compareRows) : null), [compareRows, compare.enabled]);

  const lines = useMemo(() => {
    const result: Array<DisplayLine> = [];
    let currentSection: string | null = null;
    rows.forEach((row) => {
      const hidden =
        hideEmptyRows && (row.kind === 'NOT_CAPTURED' || (row.kind === 'DIAGNOSIS' && row.total === 0));
      if (row.section && row.section !== currentSection) {
        currentSection = row.section;
        result.push({ type: 'section', section: row.section, total: 0, rowCount: 0 });
      } else if (!row.section) {
        currentSection = null;
      }
      if (row.section) {
        const sectionLine = result.filter((line) => line.type === 'section').pop() as Extract<
          DisplayLine,
          { type: 'section' }
        >;
        if (row.kind === 'DIAGNOSIS') {
          sectionLine.total += row.total;
        }
        if (!hidden) {
          sectionLine.rowCount += 1;
        }
      }
      if (!hidden && !(row.section && collapsedSections.has(row.section))) {
        result.push({ type: 'row', row });
      }
    });
    // Drop section bands whose rows are all hidden.
    return result.filter((line) => line.type !== 'section' || line.rowCount > 0);
  }, [rows, hideEmptyRows, collapsedSections]);

  const chartData = useMemo(
    () =>
      Array.from(primary.sectionTotals.entries()).map(([section, total]) => ({
        label: section,
        value: total,
        compareValue: compare.enabled ? compareSummary?.sectionTotals.get(section) ?? 0 : undefined,
      })),
    [primary, compareSummary, compare.enabled],
  );

  const kpiItems = useMemo(() => {
    const items = [
      { label: t('totalDiseases', 'Total Diseases'), value: primary.totalDiseases },
      { label: t('topCategory', 'Top Category'), value: primary.topSection ? primary.topSection[0] : '—' },
      { label: t('topDisease', 'Top Disease'), value: primary.topRow ? primary.topRow[0] : '—' },
    ];
    if (!compareSummary) {
      return items;
    }
    const compareValues: Array<React.ReactNode> = [
      compareSummary.totalDiseases,
      compareSummary.topSection ? compareSummary.topSection[0] : '—',
      compareSummary.topRow ? compareSummary.topRow[0] : '—',
    ];
    return items.map((item, index) => ({
      ...item,
      compareValue: compareValues[index],
      compareLabel: compare.comparison.label,
    }));
  }, [t, primary, compareSummary, compare.comparison.label]);

  const comparisonTableRows = useMemo(() => {
    if (!compareSummary) {
      return [];
    }
    return Array.from(primary.sectionTotals.keys()).map((section) => ({
      label: section,
      current: primary.sectionTotals.get(section) ?? 0,
      compare: compareSummary.sectionTotals.get(section) ?? 0,
    }));
  }, [primary, compareSummary]);

  const mainExportSheet = useMemo<ExportSheet>(() => {
    const exportRows: ExportSheet['rows'] = [
      [t('primaryHealthActivityReport', 'Primary Health Activity Report')],
      [`${t('site', 'Site')}: ${siteName}`],
      [`${t('period', 'Period')}: ${periodLabel}`],
    ];
    let currentSection: string | null = null;
    rows.forEach((row) => {
      if (row.section && row.section !== currentSection) {
        currentSection = row.section;
        exportRows.push([row.section]);
      }
      exportRows.push(
        row.kind === 'NOT_CAPTURED'
          ? [row.number ?? '', row.label, ...AGE_GENDER_COLUMNS.map(() => NOT_CAPTURED), NOT_CAPTURED]
          : [
              row.number ?? '',
              row.label,
              ...AGE_GENDER_COLUMNS.map((col) => row.counts?.[col.key] ?? 0),
              row.total,
            ],
      );
    });
    return {
      name: t('diseaseSummary', 'Disease Summary'),
      headers: [
        t('number', 'No.'),
        t('disease', 'Disease'),
        ...AGE_GROUPS.flatMap((ageGroup) => [`${ageGroup} Male`, `${ageGroup} Female`]),
        t('total', 'Total'),
      ],
      rows: exportRows,
    };
  }, [t, rows, siteName, periodLabel]);

  const exportExtraSheets = useMemo<Array<ExportSheet>>(() => {
    if (!compare.enabled) {
      return [];
    }
    return [
      buildComparisonExportSheet(
        comparisonTableRows,
        t('category', 'Category'),
        compare.primary.label,
        compare.comparison.label,
        t,
      ),
      buildKpiExportSheet(kpiItems, t),
    ];
  }, [t, compare.enabled, comparisonTableRows, compare.primary.label, compare.comparison.label, kpiItems]);

  const filteredDiagnoses = useMemo(() => {
    const query = diagnosisSearch.trim().toLowerCase();
    const diagnoses = diagnosisListRow?.diagnoses ?? [];
    return query ? diagnoses.filter((name) => name.toLowerCase().includes(query)) : diagnoses;
  }, [diagnosisListRow, diagnosisSearch]);

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  function openDrilldown(row: DiseaseActivityRow, column?: AgeGenderColumn) {
    setSelection({
      rowKey: row.rowKey,
      label: row.label,
      ageGroup: column?.ageGroup,
      gender: column?.genderCode,
      cellLabel: column ? `${column.ageGroup} ${column.gender}` : undefined,
      startDate: primaryStartDate,
      endDate: primaryEndDate,
      locationUuid: locationUuid || undefined,
    });
  }

  function openDiagnosisList(row: DiseaseActivityRow) {
    setDiagnosisSearch('');
    setDiagnosisListRow(row);
  }

  function countCell(row: DiseaseActivityRow, value: number, column?: AgeGenderColumn) {
    if (row.kind === 'NOT_CAPTURED') {
      return (
        <span className={styles.notCaptured} title={t('notCapturedYet', 'Not recorded in the system yet')}>
          {NOT_CAPTURED}
        </span>
      );
    }
    return value > 0 ? (
      <button className={pageStyles.linkCell} onClick={() => openDrilldown(row, column)}>
        {value}
      </button>
    ) : (
      value
    );
  }

  function renderLine(line: DisplayLine) {
    if (line.type === 'section') {
      const collapsed = collapsedSections.has(line.section);
      return (
        <tr
          key={`section-${line.section}`}
          className={pageStyles.categoryHeaderRow}
          onClick={() => toggleSection(line.section)}
        >
          <td colSpan={AGE_GENDER_COLUMNS.length + 3} className="left">
            <button className={pageStyles.collapseToggle} aria-expanded={!collapsed}>
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              {line.section}
              {collapsed && ` (${line.total})`}
            </button>
          </td>
        </tr>
      );
    }
    const { row } = line;
    const content = (value: React.ReactNode) => (row.kind === 'TOTAL' ? <strong>{value}</strong> : value);
    return (
      <tr
        key={row.rowKey}
        className={
          row.kind === 'TOTAL' ? pageStyles.dailyTotalRow : row.kind === 'SUBTOTAL' ? styles.subtotalRow : undefined
        }
      >
        {row.kind === 'TOTAL' ? (
          <td className="left" colSpan={2}>
            {content(row.label)}
          </td>
        ) : (
          <>
            <td className={styles.numberCell}>{row.number}</td>
            <td className="left">
              {row.diagnoses?.length > 0 ? (
                <button
                  className={pageStyles.linkCell}
                  title={t('showDiagnosesCountedHere', 'Show the diagnoses counted under this row')}
                  onClick={() => openDiagnosisList(row)}
                >
                  {row.label}
                </button>
              ) : (
                row.label
              )}
            </td>
          </>
        )}
        {AGE_GENDER_COLUMNS.map((col) => (
          <td key={col.key}>{content(countCell(row, row.counts?.[col.key] ?? 0, col))}</td>
        ))}
        <td>{content(countCell(row, row.total))}</td>
      </tr>
    );
  }

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('diseaseSummaryReportTitle', 'Disease Surveillance Summary Report')}</h2>
        <div className={styles.reportHeader}>
          <span>
            <strong>{t('primaryHealthActivityReport', 'Primary Health Activity Report')}</strong>
          </span>
          <span>
            {t('site', 'Site')}: {siteName}
          </span>
          <span>{periodLabel}</span>
        </div>

        {!dataLoading && <KpiTiles items={kpiItems} />}

        {!dataLoading && compare.enabled && (
          <>
            <h3 className={pageStyles.pageHeading}>
              {t('categoryComparisonHeading', 'Category comparison: {{primary}} vs {{comparison}}', {
                primary: compare.primary.label,
                comparison: compare.comparison.label,
              })}
            </h3>
            <ComparisonSummaryTable
              rows={comparisonTableRows}
              rowLabel={t('category', 'Category')}
              currentLabel={compare.primary.label}
              compareLabel={compare.comparison.label}
              emptyMessage={t('noDataForEitherPeriod', 'No data found for either period.')}
            />
          </>
        )}

        <MonthCompareControls {...compare} />

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
            <Button
              size="md"
              onClick={() =>
                setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined })
              }
            >
              {t('filter', 'Filter')}
            </Button>
          </div>
        )}

        <div className={pageStyles.filterTile}>
          <LocationFilter id="diseaseSummaryLocationFilter" value={locationUuid} onChange={setLocationUuid} />
          <div className={pageStyles.filterField}>
            <Checkbox
              id="hideEmptyDiseaseRows"
              labelText={t('hideRowsWithNoCases', 'Hide rows with no cases')}
              checked={hideEmptyRows}
              onChange={(_e, { checked }) => setHideEmptyRows(checked)}
            />
          </div>
        </div>

        <ExportButtons
          filenameBase="disease-summary-report"
          mainSheet={mainExportSheet}
          extraSheets={exportExtraSheets}
          disabled={dataLoading}
        />

        <div className={pageStyles.viewSwitcher}>
          <ContentSwitcher
            size="md"
            selectedIndex={viewMode === 'table' ? 0 : 1}
            onChange={({ name }) => setViewMode(name as 'table' | 'graph')}
          >
            <Switch name="table" text={t('table', 'Table')} />
            <Switch name="graph" text={t('graph', 'Graph')} />
          </ContentSwitcher>
        </div>

        {dataLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!dataLoading && viewMode === 'table' && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>{t('number', 'No.')}</th>
                  <th rowSpan={2} className="left">
                    {t('disease', 'Disease')}
                  </th>
                  {AGE_GROUPS.map((ageGroup) => (
                    <th key={ageGroup} colSpan={2}>
                      {t('ageGroupYears', '{{ageGroup}} Years', { ageGroup })}
                    </th>
                  ))}
                  <th rowSpan={2}>{t('total', 'Total')}</th>
                </tr>
                <tr>
                  {AGE_GENDER_COLUMNS.map((col) => (
                    <th key={col.key}>{col.gender}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(renderLine)}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={AGE_GENDER_COLUMNS.length + 3} className={pageStyles.emptyState}>
                      {t('noDataForSelection', 'No data found for this selection.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!dataLoading && viewMode === 'graph' && (
          <SimpleBarChart
            data={chartData}
            emptyMessage={t('noDataForSelection', 'No data found for this selection.')}
            currentLabel={compare.enabled ? compare.primary.label : undefined}
            compareLabel={compare.enabled ? compare.comparison.label : undefined}
          />
        )}
      </div>

      {diagnosisListRow && (
        <Modal
          open
          modalHeading={diagnosisListRow.label}
          passiveModal
          onRequestClose={() => setDiagnosisListRow(null)}
        >
          <p className={styles.diagnosisListIntro}>
            {t('diagnosesCountedUnderRow', '{{count}} diagnoses are counted under this row.', {
              count: diagnosisListRow.diagnoses.length,
            })}
          </p>
          <Search
            size="md"
            labelText={t('searchDiagnoses', 'Search diagnoses')}
            placeholder={t('searchDiagnosesPlaceholder', 'Search diagnoses...')}
            value={diagnosisSearch}
            onChange={(e) => setDiagnosisSearch(e.target.value)}
            onClear={() => setDiagnosisSearch('')}
          />
          {filteredDiagnoses.length === 0 ? (
            <p className={styles.diagnosisListIntro}>{t('noMatchingDiagnoses', 'No diagnoses match your search.')}</p>
          ) : (
            <ul className={styles.diagnosisList}>
              {filteredDiagnoses.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {selection && (
        <Modal
          open
          modalHeading={`${selection.label}${selection.cellLabel ? ` » ${selection.cellLabel}` : ''}`}
          passiveModal
          onRequestClose={() => setSelection(null)}
        >
          {patientsLoading && <InlineLoading description={t('loadingPatients', 'Loading patients...')} />}
          {!patientsLoading && patients.length === 0 && (
            <p>{t('noPatientsForSelection', 'No patients found for this selection.')}</p>
          )}
          {!patientsLoading && patients.length > 0 && (
            <div className={pageStyles.tableContainer}>
              <table className={pageStyles.dataTable}>
                <thead>
                  <tr>
                    <th className="left">{t('name', 'Name')}</th>
                    <th className="left">{t('identifier', 'Identifier')}</th>
                    <th className="left">{t('sex', 'Sex')}</th>
                    <th className="left">{t('nationalId', 'National ID')}</th>
                    <th className="left">{t('phoneNumber', 'Phone Number')}</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.patientId}
                      className={pageStyles.clickableRow}
                      onClick={() => navigate({ to: `\${openmrsSpaBase}/patient/${patient.patientUuid}/chart/visits` })}
                    >
                      <td className="left">
                        {patient.givenName} {patient.familyName}
                      </td>
                      <td className="left">{patient.identifier}</td>
                      <td className="left">{patient.sex}</td>
                      <td className="left">{patient.nationalId}</td>
                      <td className="left">{patient.phoneNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
