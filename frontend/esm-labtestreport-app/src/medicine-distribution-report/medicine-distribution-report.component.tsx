import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, InlineLoading, Search, Select, SelectItem, Switch } from '@carbon/react';
import { navigate, useLocations } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { useMedicineDistributionReport, type MedicineDistributionRow } from './medicine-distribution-report.resource';

const SEARCHABLE_FIELDS: Array<keyof MedicineDistributionRow> = [
  'givenName',
  'middleName',
  'familyName',
  'nationalId',
  'phoneNumber',
  'drugName',
  'location',
  'prescriber',
];

const LOCATION_TAG = 'Login Location';

type ViewMode = 'medicine' | 'patient';

/** Dispense-status filter values; "notDispensed" covers orders pharmacy has not acted on yet. */
type DispenseFilter = '' | 'dispensed' | 'notDispensed' | 'refusedOrOnHold';

const DISPENSED_STATUS = 'Completed';

/** One row of the medicine-wise summary: every prescription of a single medicine, rolled up. */
interface MedicineSummaryRow {
  drugName: string;
  patientCount: number;
  prescriptionCount: number;
  dispensedCount: number;
  quantityPrescribed: number;
  quantityDispensed: number;
  quantityUnits: string;
}

function isDispensed(row: MedicineDistributionRow): boolean {
  return (row.quantityDispensed ?? 0) > 0;
}

function matchesDispenseFilter(row: MedicineDistributionRow, filter: DispenseFilter): boolean {
  switch (filter) {
    case 'dispensed':
      return isDispensed(row);
    case 'notDispensed':
      return !row.dispenseStatus;
    case 'refusedOrOnHold':
      return Boolean(row.dispenseStatus) && row.dispenseStatus !== DISPENSED_STATUS;
    default:
      return true;
  }
}

/** "2 Tablet", or just "2" when the unit is missing, or '' when there is no value at all. */
function withUnit(value: number | null, unit: string | null): string {
  if (value === null || value === undefined) {
    return '';
  }
  return unit ? `${value} ${unit}` : String(value);
}

function patientName(row: MedicineDistributionRow): string {
  return `${row.givenName} ${row.middleName ? `${row.middleName} ` : ''}${row.familyName}`.trim();
}

export default function MedicineDistributionReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [locationUuid, setLocationUuid] = useState('');
  const [drugFilter, setDrugFilter] = useState('');
  const [dispenseFilter, setDispenseFilter] = useState<DispenseFilter>('');
  const [viewMode, setViewMode] = useState<ViewMode>('medicine');
  const locations = useLocations(LOCATION_TAG);

  const { rows, isLoading } = useMedicineDistributionReport(
    appliedDates.startDate,
    appliedDates.endDate,
    locationUuid || undefined,
  );

  const drugOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.drugName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!drugFilter || row.drugName === drugFilter) &&
        matchesDispenseFilter(row, dispenseFilter) &&
        (!term ||
          SEARCHABLE_FIELDS.map((field) => row[field]).some(
            (value) => typeof value === 'string' && value.toLowerCase().includes(term),
          )),
    );
  }, [rows, searchTerm, drugFilter, dispenseFilter]);

  const medicineSummary = useMemo<Array<MedicineSummaryRow>>(() => {
    const byDrug = new Map<string, { rows: Array<MedicineDistributionRow>; patients: Set<number> }>();
    filteredRows.forEach((row) => {
      const key = row.drugName ?? '';
      const entry = byDrug.get(key) ?? { rows: [], patients: new Set<number>() };
      entry.rows.push(row);
      entry.patients.add(row.patientId);
      byDrug.set(key, entry);
    });
    return Array.from(byDrug.entries()).map(([drugName, entry]) => ({
      drugName,
      patientCount: entry.patients.size,
      prescriptionCount: entry.rows.length,
      dispensedCount: entry.rows.filter(isDispensed).length,
      quantityPrescribed: entry.rows.reduce((sum, row) => sum + (row.quantityPrescribed ?? 0), 0),
      quantityDispensed: entry.rows.reduce((sum, row) => sum + (row.quantityDispensed ?? 0), 0),
      // A medicine is almost always ordered in one unit; show the first one seen rather than mixing.
      quantityUnits: entry.rows.find((row) => row.quantityUnits)?.quantityUnits ?? '',
    }));
  }, [filteredRows]);

  const summarySortAccessors = useMemo(
    () => ({
      drugName: (row: MedicineSummaryRow) => row.drugName,
      patientCount: (row: MedicineSummaryRow) => row.patientCount,
      prescriptionCount: (row: MedicineSummaryRow) => row.prescriptionCount,
      dispensedCount: (row: MedicineSummaryRow) => row.dispensedCount,
      quantityPrescribed: (row: MedicineSummaryRow) => row.quantityPrescribed,
      quantityDispensed: (row: MedicineSummaryRow) => row.quantityDispensed,
    }),
    [],
  );
  const summarySort = useSortableRows(medicineSummary, summarySortAccessors, 'patientCount');

  const detailSortAccessors = useMemo(
    () => ({
      name: (row: MedicineDistributionRow) =>
        `${row.familyName} ${row.givenName}${row.middleName ? ` ${row.middleName}` : ''}`,
      dateActivated: (row: MedicineDistributionRow) => row.dateActivated,
      drugName: (row: MedicineDistributionRow) => row.drugName ?? '',
      age: (row: MedicineDistributionRow) => row.age,
      gender: (row: MedicineDistributionRow) => row.gender ?? '',
      nationalId: (row: MedicineDistributionRow) => row.nationalId ?? '',
      phoneNumber: (row: MedicineDistributionRow) => row.phoneNumber ?? '',
      dose: (row: MedicineDistributionRow) => row.dose,
      frequency: (row: MedicineDistributionRow) => row.frequency ?? '',
      duration: (row: MedicineDistributionRow) => row.duration,
      quantityPrescribed: (row: MedicineDistributionRow) => row.quantityPrescribed,
      quantityDispensed: (row: MedicineDistributionRow) => row.quantityDispensed,
      dispenseStatus: (row: MedicineDistributionRow) => row.dispenseStatus ?? '',
      location: (row: MedicineDistributionRow) => row.location ?? '',
      prescriber: (row: MedicineDistributionRow) => row.prescriber ?? '',
    }),
    [],
  );
  const detailSort = useSortableRows(filteredRows, detailSortAccessors, 'dateActivated');

  function dispenseStatusLabel(row: MedicineDistributionRow): string {
    if (!row.dispenseStatus) {
      return t('notDispensed', 'Not dispensed');
    }
    return row.dispenseStatus === DISPENSED_STATUS ? t('dispensed', 'Dispensed') : row.dispenseStatus;
  }

  function doseLabel(row: MedicineDistributionRow): string {
    const dose = withUnit(row.dose, row.doseUnits);
    return row.asNeeded ? `${dose} ${t('asNeededShort', '(PRN)')}`.trim() : dose;
  }

  const kpiItems = useMemo(
    () => [
      { label: t('totalPrescriptions', 'Total Prescriptions'), value: filteredRows.length },
      {
        label: t('uniquePatients', 'Unique Patients'),
        value: new Set(filteredRows.map((row) => row.patientId)).size,
      },
      { label: t('distinctMedicines', 'Distinct Medicines'), value: medicineSummary.length },
      { label: t('prescriptionsDispensed', 'Prescriptions Dispensed'), value: filteredRows.filter(isDispensed).length },
      {
        label: t('notYetDispensed', 'Not Yet Dispensed'),
        value: filteredRows.filter((row) => !row.dispenseStatus).length,
      },
    ],
    [t, filteredRows, medicineSummary],
  );

  const detailExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('patientWise', 'Patient-wise'),
      headers: [
        t('givenName', 'Given Name'),
        t('middleName', 'Middle Name'),
        t('familyName', 'Family Name'),
        t('nationalId', 'National ID'),
        t('phoneNumber', 'Phone Number'),
        t('age', 'Age'),
        t('gender', 'Gender'),
        t('dateOrdered', 'Date Ordered'),
        t('medicine', 'Medicine'),
        t('dose', 'Dose'),
        t('doseUnits', 'Dose Units'),
        t('frequency', 'Frequency'),
        t('route', 'Route'),
        t('duration', 'Duration'),
        t('durationUnits', 'Duration Units'),
        t('asNeeded', 'As Needed'),
        t('quantityPrescribed', 'Quantity Prescribed'),
        t('quantityDispensed', 'Quantity Dispensed'),
        t('quantityUnits', 'Quantity Units'),
        t('dispenseStatus', 'Dispense Status'),
        t('instructions', 'Instructions'),
        t('location', 'Location'),
        t('prescriber', 'Prescriber'),
      ],
      rows: detailSort.sortedRows.map((row) => [
        row.givenName,
        row.middleName ?? '',
        row.familyName,
        row.nationalId ?? '',
        row.phoneNumber ?? '',
        row.age ?? '',
        row.gender ?? '',
        row.dateActivated,
        row.drugName ?? '',
        row.dose ?? '',
        row.doseUnits ?? '',
        row.frequency ?? '',
        row.route ?? '',
        row.duration ?? '',
        row.durationUnits ?? '',
        row.asNeeded ? t('yes', 'Yes') : t('no', 'No'),
        row.quantityPrescribed ?? '',
        row.quantityDispensed ?? '',
        row.quantityUnits ?? '',
        dispenseStatusLabel(row),
        row.dosingInstructions ?? '',
        row.location ?? '',
        row.prescriber ?? '',
      ]),
    }),
    // dispenseStatusLabel only depends on t
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, detailSort.sortedRows],
  );

  const summaryExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('medicineWise', 'Medicine-wise'),
      headers: [
        t('medicine', 'Medicine'),
        t('patients', 'Patients'),
        t('prescriptions', 'Prescriptions'),
        t('prescriptionsDispensed', 'Prescriptions Dispensed'),
        t('quantityPrescribed', 'Quantity Prescribed'),
        t('quantityDispensed', 'Quantity Dispensed'),
        t('quantityUnits', 'Quantity Units'),
      ],
      rows: summarySort.sortedRows.map((row) => [
        row.drugName,
        row.patientCount,
        row.prescriptionCount,
        row.dispensedCount,
        row.quantityPrescribed,
        row.quantityDispensed,
        row.quantityUnits,
      ]),
    }),
    [t, summarySort.sortedRows],
  );

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  function resetFilters() {
    setStartDateInput('');
    setEndDateInput('');
    setAppliedDates({});
    setSearchTerm('');
    setLocationUuid('');
    setDrugFilter('');
    setDispenseFilter('');
  }

  /** Clicking a medicine in the summary drills down to the patients who were given it. */
  function showPatientsFor(drugName: string) {
    setDrugFilter(drugName);
    setViewMode('patient');
  }

  function goToPatientChart(patientUuid: string) {
    navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/medications` });
  }

  return (
    <div>
      <BackToReportsLink to="stock-reports-home" label={t('stockReports', 'Stock Reports')} />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('medicineDistributionReportTitle', 'Medicine Distribution Report')}</h2>
        <p className={pageStyles.pageSubtitle}>
          {t(
            'medicineDistributionReportSubtitle',
            'Which medicines were prescribed to which patients, with dose, frequency, duration and how much pharmacy dispensed.',
          )}
        </p>

        {!isLoading && <KpiTiles items={kpiItems} />}

        <div className={pageStyles.viewSwitcher}>
          <ContentSwitcher
            size="md"
            selectedIndex={viewMode === 'medicine' ? 0 : 1}
            onChange={({ name }) => setViewMode(name as ViewMode)}
          >
            <Switch name="medicine" text={t('byMedicine', 'By Medicine')} />
            <Switch name="patient" text={t('byPatient', 'By Patient')} />
          </ContentSwitcher>
        </div>

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
          <Button size="md" onClick={applyFilter}>
            {t('filter', 'Filter')}
          </Button>
          <div className={pageStyles.filterField}>
            <Select
              id="drugFilter"
              labelText={t('medicine', 'Medicine')}
              value={drugFilter}
              onChange={(e) => setDrugFilter(e.target.value)}
            >
              <SelectItem value="" text={t('allMedicines', 'All medicines')} />
              {drugOptions.map((drugName) => (
                <React.Fragment key={drugName}>
                  <SelectItem value={drugName} text={drugName} />
                </React.Fragment>
              ))}
            </Select>
          </div>
          <div className={pageStyles.filterField}>
            <Select
              id="dispenseFilter"
              labelText={t('dispenseStatus', 'Dispense Status')}
              value={dispenseFilter}
              onChange={(e) => setDispenseFilter(e.target.value as DispenseFilter)}
            >
              <SelectItem value="" text={t('all', 'All')} />
              <SelectItem value="dispensed" text={t('dispensed', 'Dispensed')} />
              <SelectItem value="notDispensed" text={t('notDispensed', 'Not dispensed')} />
              <SelectItem value="refusedOrOnHold" text={t('refusedOrOnHold', 'Refused / On hold')} />
            </Select>
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchMedicineDistributionPlaceholder', 'Search patient, ID, phone, medicine, prescriber...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="ghost" size="md" onClick={resetFilters}>
            {t('reset', 'Reset')}
          </Button>
        </div>

        <ExportButtons
          filenameBase="medicine-distribution-report"
          mainSheet={viewMode === 'medicine' ? summaryExportSheet : detailExportSheet}
          extraSheets={[viewMode === 'medicine' ? detailExportSheet : summaryExportSheet]}
          disabled={isLoading}
        />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && viewMode === 'medicine' && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('medicine', 'Medicine')}
                    sortKey="drugName"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('patients', 'Patients')}
                    sortKey="patientCount"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                  />
                  <SortableHeader
                    label={t('prescriptions', 'Prescriptions')}
                    sortKey="prescriptionCount"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                  />
                  <SortableHeader
                    label={t('prescriptionsDispensed', 'Prescriptions Dispensed')}
                    sortKey="dispensedCount"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                  />
                  <SortableHeader
                    label={t('quantityPrescribed', 'Quantity Prescribed')}
                    sortKey="quantityPrescribed"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                  />
                  <SortableHeader
                    label={t('quantityDispensed', 'Quantity Dispensed')}
                    sortKey="quantityDispensed"
                    activeSortKey={summarySort.sortKey}
                    direction={summarySort.direction}
                    onSort={summarySort.toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {summarySort.sortedRows.map((row) => (
                  <tr
                    key={row.drugName}
                    className={pageStyles.clickableRow}
                    onClick={() => showPatientsFor(row.drugName)}
                  >
                    <td className="left">{row.drugName || '--'}</td>
                    <td>{row.patientCount}</td>
                    <td>{row.prescriptionCount}</td>
                    <td>{row.dispensedCount}</td>
                    <td>{withUnit(row.quantityPrescribed, row.quantityUnits)}</td>
                    <td>{withUnit(row.quantityDispensed, row.quantityUnits)}</td>
                  </tr>
                ))}
                {summarySort.sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className={pageStyles.emptyState}>
                      {t('noPrescriptionsForSelection', 'No prescriptions found for this selection.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && viewMode === 'patient' && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('patientName', 'Patient Name')}
                    sortKey="name"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('nationalId', 'National ID')}
                    sortKey="nationalId"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('phoneNumber', 'Phone Number')}
                    sortKey="phoneNumber"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('age', 'Age')}
                    sortKey="age"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('gender', 'Gender')}
                    sortKey="gender"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('dateOrdered', 'Date Ordered')}
                    sortKey="dateActivated"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('medicine', 'Medicine')}
                    sortKey="drugName"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('dose', 'Dose')}
                    sortKey="dose"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('frequency', 'Frequency')}
                    sortKey="frequency"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <th className="left">{t('route', 'Route')}</th>
                  <SortableHeader
                    label={t('duration', 'Duration')}
                    sortKey="duration"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('quantityPrescribed', 'Quantity Prescribed')}
                    sortKey="quantityPrescribed"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('quantityDispensed', 'Quantity Dispensed')}
                    sortKey="quantityDispensed"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                  />
                  <SortableHeader
                    label={t('dispenseStatus', 'Dispense Status')}
                    sortKey="dispenseStatus"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('location', 'Location')}
                    sortKey="location"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('prescriber', 'Prescriber')}
                    sortKey="prescriber"
                    activeSortKey={detailSort.sortKey}
                    direction={detailSort.direction}
                    onSort={detailSort.toggleSort}
                    className="left"
                  />
                </tr>
              </thead>
              <tbody>
                {detailSort.sortedRows.map((row) => (
                  <tr
                    key={row.orderId}
                    className={pageStyles.clickableRow}
                    onClick={() => goToPatientChart(row.patientUuid)}
                  >
                    <td className="left">{patientName(row)}</td>
                    <td className="left">{row.nationalId || '--'}</td>
                    <td className="left">{row.phoneNumber || '--'}</td>
                    <td>{row.age ?? '--'}</td>
                    <td>{row.gender || '--'}</td>
                    <td>{row.dateActivated}</td>
                    <td className="left">{row.drugName || '--'}</td>
                    <td>{doseLabel(row) || '--'}</td>
                    <td className="left">{row.frequency || '--'}</td>
                    <td className="left">{row.route || '--'}</td>
                    <td>{withUnit(row.duration, row.durationUnits) || '--'}</td>
                    <td>{withUnit(row.quantityPrescribed, row.quantityUnits) || '--'}</td>
                    <td>{withUnit(row.quantityDispensed, row.quantityUnits) || '--'}</td>
                    <td className="left">{dispenseStatusLabel(row)}</td>
                    <td className="left">{row.location || '--'}</td>
                    <td className="left">{row.prescriber || '--'}</td>
                  </tr>
                ))}
                {detailSort.sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={16} className={pageStyles.emptyState}>
                      {t('noPrescriptionsForSelection', 'No prescriptions found for this selection.')}
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
