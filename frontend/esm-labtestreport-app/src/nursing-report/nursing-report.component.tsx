import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, Search, Select, SelectItem, Button } from '@carbon/react';
import { navigate, useLocations } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { useNursingReport, type NursingReportRow } from './nursing-report.resource';

const SEARCHABLE_FIELDS: Array<keyof NursingReportRow> = [
  'givenName',
  'middleName',
  'familyName',
  'location',
  'typeOfWound',
  'ointments',
  'imInjection',
  'ivInjection',
  'oral',
  'nebulization',
];

const LOCATION_TAG = 'Login Location';

/** The four medication-administration columns, so "any medication given" is defined in one place. */
const MEDICATION_FIELDS: Array<keyof NursingReportRow> = ['imInjection', 'ivInjection', 'oral', 'nebulization'];

function hasAnyMedication(row: NursingReportRow): boolean {
  return MEDICATION_FIELDS.some((field) => Boolean(row[field]));
}

export default function NursingReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [locationUuid, setLocationUuid] = useState('');
  const locations = useLocations(LOCATION_TAG);

  const { rows, isLoading } = useNursingReport(appliedDates.startDate, appliedDates.endDate, locationUuid || undefined);

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
      name: (row: NursingReportRow) =>
        `${row.familyName} ${row.givenName}${row.middleName ? ` ${row.middleName}` : ''}`,
      encounterDatetime: (row: NursingReportRow) => row.encounterDatetime,
      location: (row: NursingReportRow) => row.location ?? '',
      age: (row: NursingReportRow) => row.age,
      gender: (row: NursingReportRow) => row.gender ?? '',
      typeOfWound: (row: NursingReportRow) => row.typeOfWound ?? '',
      ointments: (row: NursingReportRow) => row.ointments ?? '',
      spirometry: (row: NursingReportRow) => row.spirometry,
      monofilament: (row: NursingReportRow) => row.monofilament,
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
      { label: t('totalNursingRecords', 'Total Nursing Records'), value: searchedRows.length },
      {
        label: t('uniquePatients', 'Unique Patients'),
        value: new Set(searchedRows.map((row) => row.patientId)).size,
      },
      {
        label: t('woundDressings', 'Wound Dressings'),
        value: searchedRows.filter((row) => Boolean(row.typeOfWound) || Boolean(row.ointments)).length,
      },
      {
        label: t('medicationsAdministered', 'Medications Administered'),
        value: searchedRows.filter(hasAnyMedication).length,
      },
      {
        label: t('ecgsRecorded', 'ECGs Recorded'),
        value: searchedRows.filter((row) => Boolean(row.ecgAttachmentUuid)).length,
      },
    ],
    [t, searchedRows],
  );

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('nursingReport', 'Nursing Report'),
      headers: [
        t('givenName', 'Given Name'),
        t('middleName', 'Middle Name'),
        t('familyName', 'Family Name'),
        t('encounterDate', 'Encounter Date'),
        t('location', 'Location'),
        t('age', 'Age'),
        t('gender', 'Gender'),
        t('typeOfWound', 'Type of Wound'),
        t('ointment', 'Ointment'),
        t('dressingNotes', 'Dressing Notes'),
        t('spirometry', 'Spirometry'),
        t('monofilament', 'Monofilament'),
        t('imInjection', 'IM Injection'),
        t('ivInjection', 'IV Injection'),
        t('oral', 'Oral'),
        t('nebulization', 'Nebulization'),
        t('ecgRecorded', 'ECG Recorded'),
      ],
      rows: searchedRows.map((row) => [
        row.givenName,
        row.middleName ?? '',
        row.familyName,
        row.encounterDatetime,
        row.location ?? '',
        row.age ?? '',
        row.gender ?? '',
        row.typeOfWound ?? '',
        row.ointments ?? '',
        row.dressingGeneralNotes ?? '',
        row.spirometry ?? '',
        row.monofilament ?? '',
        row.imInjection ?? '',
        row.ivInjection ?? '',
        row.oral ?? '',
        row.nebulization ?? '',
        row.ecgAttachmentUuid ? t('yes', 'Yes') : t('no', 'No'),
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
    setLocationUuid('');
  }

  function goToPatientChart(patientUuid: string) {
    navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/visits` });
  }

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('nursingReportTitle', 'Nursing Report')}</h2>
        <p className={pageStyles.pageSubtitle}>
          {t(
            'nursingReportSubtitle',
            'Every nursing record: wound dressings, measurements and medications administered by the nursing team.',
          )}
        </p>

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
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchNursingPlaceholder', 'Search name, wound, ointment, medication...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="ghost" size="md" onClick={resetFilters}>
            {t('reset', 'Reset')}
          </Button>
        </div>

        <ExportButtons filenameBase="nursing-report" mainSheet={mainExportSheet} disabled={isLoading} />

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
                  <SortableHeader
                    label={t('age', 'Age')}
                    sortKey="age"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('gender', 'Gender')}
                    sortKey="gender"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('typeOfWound', 'Type of Wound')}
                    sortKey="typeOfWound"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('ointment', 'Ointment')}
                    sortKey="ointments"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('dressingNotes', 'Dressing Notes')}</th>
                  <SortableHeader
                    label={t('spirometry', 'Spirometry')}
                    sortKey="spirometry"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('monofilament', 'Monofilament')}
                    sortKey="monofilament"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th className="left">{t('imInjection', 'IM Injection')}</th>
                  <th className="left">{t('ivInjection', 'IV Injection')}</th>
                  <th className="left">{t('oral', 'Oral')}</th>
                  <th className="left">{t('nebulization', 'Nebulization')}</th>
                  <th>{t('ecgRecorded', 'ECG Recorded')}</th>
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
                      {row.givenName} {row.middleName ? `${row.middleName} ` : ''}
                      {row.familyName}
                    </td>
                    <td>{row.encounterDatetime}</td>
                    <td className="left">{row.location || '--'}</td>
                    <td>{row.age ?? '--'}</td>
                    <td>{row.gender || '--'}</td>
                    <td className="left">{row.typeOfWound || '--'}</td>
                    <td className="left">{row.ointments || '--'}</td>
                    <td className="left">{row.dressingGeneralNotes || '--'}</td>
                    <td>{row.spirometry ?? '--'}</td>
                    <td>{row.monofilament ?? '--'}</td>
                    <td className="left">{row.imInjection || '--'}</td>
                    <td className="left">{row.ivInjection || '--'}</td>
                    <td className="left">{row.oral || '--'}</td>
                    <td className="left">{row.nebulization || '--'}</td>
                    <td>{row.ecgAttachmentUuid ? t('yes', 'Yes') : '--'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={15} className={pageStyles.emptyState}>
                      {t('noNursingRecordsForSelection', 'No nursing records found for this selection.')}
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
