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
import { useHealthPromotionReport, type HealthPromotionRow } from './health-promotion-report.resource';

const SEARCHABLE_FIELDS: Array<keyof HealthPromotionRow> = [
  'givenName',
  'middleName',
  'familyName',
  'participantName',
  'nationalId',
  'phoneNumber',
  'fullAddress',
  'governorate',
  'neighborhood',
  'topic',
  'chwName',
];

const LOCATION_TAG = 'Login Location';

export default function HealthPromotionReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [locationUuid, setLocationUuid] = useState('');
  const locations = useLocations(LOCATION_TAG);

  const { rows, isLoading } = useHealthPromotionReport(
    appliedDates.startDate,
    appliedDates.endDate,
    locationUuid || undefined,
  );

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
      name: (row: HealthPromotionRow) =>
        `${row.familyName} ${row.givenName}${row.middleName ? ` ${row.middleName}` : ''}`,
      encounterDatetime: (row: HealthPromotionRow) => row.encounterDatetime,
      location: (row: HealthPromotionRow) => row.location ?? '',
      participantName: (row: HealthPromotionRow) => row.participantName ?? '',
      age: (row: HealthPromotionRow) => row.age,
      gender: (row: HealthPromotionRow) => row.gender ?? '',
      fullAddress: (row: HealthPromotionRow) => row.fullAddress ?? '',
      governorate: (row: HealthPromotionRow) => row.governorate ?? '',
      neighborhood: (row: HealthPromotionRow) => row.neighborhood ?? '',
      sessionDate: (row: HealthPromotionRow) => row.sessionDate ?? '',
      sessionType: (row: HealthPromotionRow) => row.sessionType ?? '',
      topic: (row: HealthPromotionRow) => row.topic ?? '',
      chwName: (row: HealthPromotionRow) => row.chwName ?? '',
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
      { label: t('totalSessions', 'Total Sessions'), value: searchedRows.length },
      {
        label: t('uniqueParticipants', 'Unique Participants'),
        value: new Set(searchedRows.map((row) => row.patientId)).size,
      },
      {
        label: t('mostRecentSession', 'Most Recent Session'),
        value:
          searchedRows.reduce<string>(
            (latest, row) => (row.encounterDatetime > latest ? row.encounterDatetime : latest),
            '',
          ) || '—',
      },
    ],
    [t, searchedRows],
  );

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('healthPromotionReport', 'Health Promotion Report'),
      headers: [
        t('givenName', 'Given Name'),
        t('middleName', 'Middle Name'),
        t('familyName', 'Family Name'),
        t('encounterDate', 'Encounter Date'),
        t('location', 'Location'),
        t('participantName', 'Participant Name'),
        t('age', 'Age'),
        t('gender', 'Gender'),
        t('nationalId', 'National ID'),
        t('phoneNumber', 'Phone Number'),
        t('fullAddress', 'Full Address'),
        t('governorate', 'Governorate'),
        t('neighborhood', 'Neighborhood'),
        t('sessionDate', 'Session Date'),
        t('sessionType', 'Session Type'),
        t('topic', 'Topic'),
        t('chwName', 'CHW Name'),
        t('notes', 'Notes'),
      ],
      rows: searchedRows.map((row) => [
        row.givenName,
        row.middleName ?? '',
        row.familyName,
        row.encounterDatetime,
        row.location ?? '',
        row.participantName ?? '',
        row.age ?? '',
        row.gender ?? '',
        row.nationalId ?? '',
        row.phoneNumber ?? '',
        row.fullAddress ?? '',
        row.governorate ?? '',
        row.neighborhood ?? '',
        row.sessionDate ?? '',
        row.sessionType ?? '',
        row.topic ?? '',
        row.chwName ?? '',
        row.notes ?? '',
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
        <h2 className={pageStyles.pageHeading}>{t('healthPromotionReportTitle', 'Health Promotion Report')}</h2>

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
              placeholder={t('searchHealthPromotionPlaceholder', 'Search name, ID, phone, topic, CHW...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="ghost" size="md" onClick={resetFilters}>
            {t('reset', 'Reset')}
          </Button>
        </div>

        <ExportButtons filenameBase="health-promotion-report" mainSheet={mainExportSheet} disabled={isLoading} />

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
                    label={t('participantName', 'Participant Name')}
                    sortKey="participantName"
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
                  <th>{t('nationalId', 'National ID')}</th>
                  <th>{t('phoneNumber', 'Phone Number')}</th>
                  <SortableHeader
                    label={t('fullAddress', 'Full Address')}
                    sortKey="fullAddress"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('governorate', 'Governorate')}
                    sortKey="governorate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('neighborhood', 'Neighborhood')}
                    sortKey="neighborhood"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('sessionDate', 'Session Date')}
                    sortKey="sessionDate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('sessionType', 'Session Type')}
                    sortKey="sessionType"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('topic', 'Topic')}
                    sortKey="topic"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('chwName', 'CHW Name')}
                    sortKey="chwName"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('notes', 'Notes')}</th>
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
                    <td className="left">{row.participantName || '--'}</td>
                    <td>{row.age ?? '--'}</td>
                    <td>{row.gender || '--'}</td>
                    <td>{row.nationalId || '--'}</td>
                    <td>{row.phoneNumber || '--'}</td>
                    <td className="left">{row.fullAddress || '--'}</td>
                    <td className="left">{row.governorate || '--'}</td>
                    <td className="left">{row.neighborhood || '--'}</td>
                    <td>{row.sessionDate || '--'}</td>
                    <td>{row.sessionType || '--'}</td>
                    <td className="left">{row.topic || '--'}</td>
                    <td className="left">{row.chwName || '--'}</td>
                    <td className="left">{row.notes || '--'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={16} className={pageStyles.emptyState}>
                      {t('noSessionsForSelection', 'No Health Promotion Session submissions found for this selection.')}
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
