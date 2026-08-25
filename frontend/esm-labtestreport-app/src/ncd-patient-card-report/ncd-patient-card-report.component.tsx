import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, Search, Button } from '@carbon/react';
import { navigate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { useNcdPatientCardReport, type NcdPatientCardRow } from './ncd-patient-card-report.resource';

const SEARCHABLE_FIELDS: Array<keyof NcdPatientCardRow> = [
  'givenName',
  'familyName',
  'fullName',
  'fileNumber',
  'phoneNumber',
  'condition',
];

export default function NcdPatientCardReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, isLoading } = useNcdPatientCardReport(appliedDates.startDate, appliedDates.endDate);

  const searchedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return rows;
    }
    return rows.filter((row) =>
      SEARCHABLE_FIELDS.map((field) => row[field]).some(
        (value) => typeof value === 'string' && value.toLowerCase().includes(term),
      ),
    );
  }, [rows, searchTerm]);

  const sortAccessors = useMemo(
    () => ({
      name: (row: NcdPatientCardRow) => `${row.familyName} ${row.givenName}`,
      encounterDatetime: (row: NcdPatientCardRow) => row.encounterDatetime,
      location: (row: NcdPatientCardRow) => row.location ?? '',
      fileNumber: (row: NcdPatientCardRow) => row.fileNumber ?? '',
      gender: (row: NcdPatientCardRow) => row.gender ?? '',
      condition: (row: NcdPatientCardRow) => row.condition ?? '',
      status: (row: NcdPatientCardRow) => row.status ?? '',
      glucose: (row: NcdPatientCardRow) => row.glucose,
      followDate: (row: NcdPatientCardRow) => row.followDate ?? '',
    }),
    [],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(
    searchedRows,
    sortAccessors,
    'encounterDatetime',
  );

  const kpiItems = useMemo(
    () => [
      { label: t('totalSubmissions', 'Total Submissions'), value: searchedRows.length },
      {
        label: t('uniquePatients', 'Unique Patients'),
        value: new Set(searchedRows.map((row) => row.patientId)).size,
      },
      {
        label: t('uncontrolledOrComplicated', 'Uncontrolled / Complicated'),
        value: searchedRows.filter((row) => row.status === 'Uncontrolled' || row.status === 'Complicated').length,
      },
      {
        label: t('mostRecentSubmission', 'Most Recent Submission'),
        value: searchedRows.reduce<string>(
          (latest, row) => (row.encounterDatetime > latest ? row.encounterDatetime : latest),
          '',
        ) || '—',
      },
    ],
    [t, searchedRows],
  );

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('ncdPatientCardReport', 'NCD Patient Card Report'),
      headers: [
        t('givenName', 'Given Name'),
        t('familyName', 'Family Name'),
        t('encounterDate', 'Encounter Date'),
        t('location', 'Location'),
        t('fullName', 'Full Name'),
        t('fileNumber', 'File Number'),
        t('dob', 'Date of Birth'),
        t('gender', 'Gender'),
        t('phoneNumber', 'Phone Number'),
        t('address', 'Address'),
        t('condition', 'Chronic Condition'),
        t('conditionStart', 'Condition Start Date'),
        t('status', 'Current Health Status'),
        t('followDate', 'Follow Up Date'),
        t('bp', 'Blood Pressure'),
        t('glucose', 'Blood Glucose'),
        t('medication', 'Medications Dispensed'),
        t('nextFollow', 'Next Follow Up Date'),
      ],
      rows: searchedRows.map((row) => [
        row.givenName,
        row.familyName,
        row.encounterDatetime,
        row.location ?? '',
        row.fullName ?? '',
        row.fileNumber ?? '',
        row.dob ?? '',
        row.gender ?? '',
        row.phoneNumber ?? '',
        row.address ?? '',
        row.condition ?? '',
        row.conditionStart ?? '',
        row.status ?? '',
        row.followDate ?? '',
        row.bp ?? '',
        row.glucose ?? '',
        row.medication ?? '',
        row.nextFollow ?? '',
      ]),
    }),
    [t, searchedRows],
  );

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  function resetFilters() {
    setStartDateInput('');
    setEndDateInput('');
    setAppliedDates({});
    setSearchTerm('');
  }

  function goToPatientChart(patientUuid: string) {
    navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/visits` });
  }

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('ncdPatientCardReportTitle', 'NCD Patient Card Report')}</h2>

        {!isLoading && <KpiTiles items={kpiItems} />}

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
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchNcdPlaceholder', 'Search name, file number, phone, condition...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="ghost" size="md" onClick={resetFilters}>
            {t('reset', 'Reset')}
          </Button>
        </div>

        <ExportButtons filenameBase="ncd-patient-card-report" mainSheet={mainExportSheet} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('patientName', 'Patient Name')}
                    sortKey="name"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('encounterDate', 'Encounter Date')}
                    sortKey="encounterDatetime"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('location', 'Location')}
                    sortKey="location"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('fullName', 'Full Name (form)')}</th>
                  <SortableHeader
                    label={t('fileNumber', 'File Number')}
                    sortKey="fileNumber"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th>{t('dob', 'Date of Birth')}</th>
                  <SortableHeader
                    label={t('gender', 'Gender')}
                    sortKey="gender"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th>{t('phoneNumber', 'Phone Number')}</th>
                  <th className="left">{t('address', 'Address')}</th>
                  <SortableHeader
                    label={t('condition', 'Chronic Condition')}
                    sortKey="condition"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th>{t('conditionStart', 'Condition Start Date')}</th>
                  <SortableHeader
                    label={t('status', 'Current Health Status')}
                    sortKey="status"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('followDate', 'Follow Up Date')}
                    sortKey="followDate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th>{t('bp', 'Blood Pressure')}</th>
                  <SortableHeader
                    label={t('glucose', 'Blood Glucose')}
                    sortKey="glucose"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th className="left">{t('medication', 'Medications Dispensed')}</th>
                  <th>{t('nextFollow', 'Next Follow Up Date')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.encounterId}
                    className={pageStyles.clickableRow}
                    onClick={() => goToPatientChart(row.patientUuid)}
                  >
                    <td className="left">
                      {row.givenName} {row.familyName}
                    </td>
                    <td>{row.encounterDatetime}</td>
                    <td className="left">{row.location || '--'}</td>
                    <td className="left">{row.fullName || '--'}</td>
                    <td>{row.fileNumber || '--'}</td>
                    <td>{row.dob || '--'}</td>
                    <td>{row.gender || '--'}</td>
                    <td>{row.phoneNumber || '--'}</td>
                    <td className="left">{row.address || '--'}</td>
                    <td>{row.condition || '--'}</td>
                    <td>{row.conditionStart || '--'}</td>
                    <td>{row.status || '--'}</td>
                    <td>{row.followDate || '--'}</td>
                    <td>{row.bp || '--'}</td>
                    <td>{row.glucose ?? '--'}</td>
                    <td className="left">{row.medication || '--'}</td>
                    <td>{row.nextFollow || '--'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={17} className={pageStyles.emptyState}>
                      {t('noSubmissionsForSelection', 'No NCD Patient Card submissions found for this selection.')}
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
