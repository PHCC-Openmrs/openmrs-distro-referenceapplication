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
import { useReferralFormReport, type ReferralFormRow } from './referral-form-report.resource';

const SEARCHABLE_FIELDS: Array<keyof ReferralFormRow> = [
  'givenName',
  'familyName',
  'fullName',
  'nationalId',
  'phoneNumber',
  'referringFacility',
  'referredTo',
];

export default function ReferralFormReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, isLoading } = useReferralFormReport(appliedDates.startDate, appliedDates.endDate);

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
      name: (row: ReferralFormRow) => `${row.familyName} ${row.givenName}`,
      encounterDatetime: (row: ReferralFormRow) => row.encounterDatetime,
      location: (row: ReferralFormRow) => row.location ?? '',
      fullName: (row: ReferralFormRow) => row.fullName ?? '',
      age: (row: ReferralFormRow) => row.age,
      gender: (row: ReferralFormRow) => row.gender ?? '',
      referralDate: (row: ReferralFormRow) => row.referralDate ?? '',
      referringFacility: (row: ReferralFormRow) => row.referringFacility ?? '',
      referredTo: (row: ReferralFormRow) => row.referredTo ?? '',
      urgency: (row: ReferralFormRow) => row.urgency ?? '',
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
      name: t('referralFormReport', 'Referral Form Report'),
      headers: [
        t('givenName', 'Given Name'),
        t('familyName', 'Family Name'),
        t('encounterDate', 'Encounter Date'),
        t('location', 'Location'),
        t('age', 'Age'),
        t('gender', 'Gender'),
        t('referralDate', 'Referral Date'),
        t('nationalId', 'National ID'),
        t('phoneNumber', 'Phone Number'),
        t('referringFacility', 'Referring Facility'),
        t('referredTo', 'Referred To'),
        t('urgency', 'Urgency of Referral'),
        t('transportation', 'Transportation Method'),
        t('referralCause', 'Referral Cause'),
        t('clinicalHistory', 'Clinical History & Examination'),
        t('managementReceived', 'Management Received'),
        t('referringDoctor', 'Referring Physician Signature'),
        t('headOfClinic', 'Head of Clinic Signature'),
        t('feedback', 'Feedback & Management Plan'),
        t('followUp', 'Follow Up Needed'),
        t('treatingDoctor', 'Treating Physician Signature'),
      ],
      rows: searchedRows.map((row) => [
        row.givenName,
        row.familyName,
        row.encounterDatetime,
        row.location ?? '',
        row.age ?? '',
        row.gender ?? '',
        row.referralDate ?? '',
        row.nationalId ?? '',
        row.phoneNumber ?? '',
        row.referringFacility ?? '',
        row.referredTo ?? '',
        row.urgency ?? '',
        row.transportation ?? '',
        row.referralCause ?? '',
        row.clinicalHistory ?? '',
        row.managementReceived ?? '',
        row.referringDoctor ?? '',
        row.headOfClinic ?? '',
        row.feedback ?? '',
        row.followUp ?? '',
        row.treatingDoctor ?? '',
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
        <h2 className={pageStyles.pageHeading}>{t('referralFormReportTitle', 'Referral Form Report')}</h2>

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
              placeholder={t('searchReferralPlaceholder', 'Search name, ID, phone, facility...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="ghost" size="md" onClick={resetFilters}>
            {t('reset', 'Reset')}
          </Button>
        </div>

        <ExportButtons filenameBase="referral-form-report" mainSheet={mainExportSheet} disabled={isLoading} />

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
                    label={t('referralDate', 'Referral Date')}
                    sortKey="referralDate"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th>{t('nationalId', 'National ID')}</th>
                  <th>{t('phoneNumber', 'Phone Number')}</th>
                  <SortableHeader
                    label={t('referringFacility', 'Referring Facility')}
                    sortKey="referringFacility"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('referredTo', 'Referred To')}
                    sortKey="referredTo"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('urgency', 'Urgency')}
                    sortKey="urgency"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <th className="left">{t('transportation', 'Transportation')}</th>
                  <th className="left">{t('referralCause', 'Referral Cause')}</th>
                  <th className="left">{t('clinicalHistory', 'Clinical History & Examination')}</th>
                  <th className="left">{t('managementReceived', 'Management Received')}</th>
                  <th className="left">{t('referringDoctor', 'Referring Physician Signature')}</th>
                  <th className="left">{t('headOfClinic', 'Head of Clinic Signature')}</th>
                  <th className="left">{t('feedback', 'Feedback & Management Plan')}</th>
                  <th className="left">{t('followUp', 'Follow Up Needed')}</th>
                  <th className="left">{t('treatingDoctor', 'Treating Physician Signature')}</th>
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
                    <td>{row.age ?? '--'}</td>
                    <td>{row.gender || '--'}</td>
                    <td>{row.referralDate || '--'}</td>
                    <td>{row.nationalId || '--'}</td>
                    <td>{row.phoneNumber || '--'}</td>
                    <td className="left">{row.referringFacility || '--'}</td>
                    <td className="left">{row.referredTo || '--'}</td>
                    <td>{row.urgency || '--'}</td>
                    <td className="left">{row.transportation || '--'}</td>
                    <td className="left">{row.referralCause || '--'}</td>
                    <td className="left">{row.clinicalHistory || '--'}</td>
                    <td className="left">{row.managementReceived || '--'}</td>
                    <td className="left">{row.referringDoctor || '--'}</td>
                    <td className="left">{row.headOfClinic || '--'}</td>
                    <td className="left">{row.feedback || '--'}</td>
                    <td className="left">{row.followUp || '--'}</td>
                    <td className="left">{row.treatingDoctor || '--'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={20} className={pageStyles.emptyState}>
                      {t('noSubmissionsForSelection', 'No Referral Form submissions found for this selection.')}
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
