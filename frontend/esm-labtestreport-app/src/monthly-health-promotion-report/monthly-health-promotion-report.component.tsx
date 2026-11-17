import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, Modal } from '@carbon/react';
import { navigate, openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import LocationFilter from '../reports-shell/location-filter.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import pageStyles from '../reports-shell/reports-page.scss';
import type { PatientRow } from '../disease-summary/disease-summary.resource';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';

interface MonthlyHealthPromotionRow {
  // 'individual', 'group', 'followUp', or 'all' for the Grand Total.
  sessionTypeKey: string;
  sessionType: string;
  // Null for a session-type row and for the Grand Total.
  category: string | null;
  subject: string | null;
  counts: Record<string, number>;
  total: number;
}

const GRAND_TOTAL_KEY = 'all';

const AGE_GROUPS = ['0-4', '5-14', '15-18', '19-49', '50-65', '65+'];
const AGE_GENDER_COLUMNS = AGE_GROUPS.flatMap((ageGroup) => [
  { key: `${ageGroup}_M`, ageGroup, genderCode: 'M', gender: 'Male' },
  { key: `${ageGroup}_F`, ageGroup, genderCode: 'F', gender: 'Female' },
]);

function useCategories(startDate?: string, endDate?: string, locationUuid?: string) {
  const search = new URLSearchParams();
  if (startDate) search.set('startDate', startDate);
  if (endDate) search.set('endDate', endDate);
  if (locationUuid) search.set('locationUuid', locationUuid);
  const query = search.toString();
  const url = `/module/labtestreport/api/monthly-health-promotion-categories.json${query ? `?${query}` : ''}`;
  const { data } = useSWR<{ data: string[] }, Error>(url, openmrsFetch);
  return data?.data ?? [];
}

function useSubjects(startDate?: string, endDate?: string, locationUuid?: string, category?: string) {
  const search = new URLSearchParams();
  if (category) search.set('category', category);
  if (startDate) search.set('startDate', startDate);
  if (endDate) search.set('endDate', endDate);
  if (locationUuid) search.set('locationUuid', locationUuid);
  const query = search.toString();
  const url = `/module/labtestreport/api/monthly-health-promotion-subjects.json${query ? `?${query}` : ''}`;
  const { data } = useSWR<{ data: string[] }, Error>(url, openmrsFetch);
  return data?.data ?? [];
}

function useMonthlyHealthPromotionReport(
  startDate?: string,
  endDate?: string,
  locationUuid?: string,
  sessionType?: string,
  category?: string,
  subject?: string,
) {
  const search = new URLSearchParams();
  if (sessionType) search.set('sessionType', sessionType);
  if (category) search.set('category', category);
  if (subject) search.set('subject', subject);
  if (startDate) search.set('startDate', startDate);
  if (endDate) search.set('endDate', endDate);
  if (locationUuid) search.set('locationUuid', locationUuid);
  const query = search.toString();
  const url = `/module/labtestreport/api/monthly-health-promotion-report.json${query ? `?${query}` : ''}`;
  const { data, isLoading } = useSWR<{ data: MonthlyHealthPromotionRow[] }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], isLoading };
}

interface Selection {
  sessionTypeKey: string;
  category?: string | null;
  subject?: string | null;
  label: string;
  ageGroup?: string;
  gender?: string;
  cellLabel?: string;
  // The number that was clicked, to tell when the list is shorter (the Grand Total counts a patient once per row).
  expectedCount?: number;
  startDate?: string;
  endDate?: string;
  locationUuid?: string;
}

function useMonthlyHealthPromotionDrilldown(selection: Selection | null) {
  const search = new URLSearchParams();
  if (selection) {
    search.set('sessionType', selection.sessionTypeKey);
    if (selection.category) search.set('category', selection.category);
    if (selection.subject) search.set('subject', selection.subject);
    if (selection.ageGroup) search.set('ageGroup', selection.ageGroup);
    if (selection.gender) search.set('gender', selection.gender);
    if (selection.startDate) search.set('startDate', selection.startDate);
    if (selection.endDate) search.set('endDate', selection.endDate);
    if (selection.locationUuid) search.set('locationUuid', selection.locationUuid);
  }
  const url = selection
    ? `/module/labtestreport/api/monthly-health-promotion-drilldown.json?${search.toString()}`
    : null;
  const { data, isLoading } = useSWR<{ data: PatientRow[] }, Error>(url, openmrsFetch);
  return { patients: data?.data ?? [], isLoading };
}

export default function MonthlyHealthPromotionReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [applied, setApplied] = useState<{ startDate?: string; endDate?: string }>({});
  const [locationUuid, setLocationUuid] = useState('');
  // Applies as soon as it's picked, like the location filter (dates wait for the Filter button).
  const [appliedSubject, setAppliedSubject] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');
  const [appliedSessionType, setAppliedSessionType] = useState('');
  const categories = useCategories(applied.startDate, applied.endDate, locationUuid || undefined);
  // Only the chosen category's subjects are offered.
  const subjects = useSubjects(
    applied.startDate,
    applied.endDate,
    locationUuid || undefined,
    appliedCategory || undefined,
  );
  const { rows, isLoading } = useMonthlyHealthPromotionReport(
    applied.startDate,
    applied.endDate,
    locationUuid || undefined,
    appliedSessionType || undefined,
    appliedCategory || undefined,
    appliedSubject || undefined,
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const { patients, isLoading: patientsLoading } = useMonthlyHealthPromotionDrilldown(selection);

  const grandTotalRow = useMemo(() => rows.find((row) => row.sessionTypeKey === GRAND_TOTAL_KEY), [rows]);
  const bodyRows = useMemo(() => rows.filter((row) => row.sessionTypeKey !== GRAND_TOTAL_KEY), [rows]);

  const openDrilldown = (
    row: MonthlyHealthPromotionRow,
    value: number,
    column?: (typeof AGE_GENDER_COLUMNS)[number],
  ) =>
    setSelection({
      expectedCount: value,
      // The Grand Total covers whichever session type the filter leaves, or all of them.
      sessionTypeKey:
        row.sessionTypeKey === GRAND_TOTAL_KEY ? appliedSessionType || GRAND_TOTAL_KEY : row.sessionTypeKey,
      // Session-type and Grand Total rows cover every category and subject, unless the filters narrow them.
      category: row.category ?? (appliedCategory || null),
      subject: row.subject ?? (appliedSubject || null),
      label: [row.sessionType, row.category, row.subject].filter(Boolean).join(' » '),
      ageGroup: column?.ageGroup,
      gender: column?.genderCode,
      cellLabel: column ? `${column.ageGroup} ${column.gender}` : undefined,
      ...applied,
      locationUuid: locationUuid || undefined,
    });

  // The Individual / Group / Follow up rows are headings for the subject rows beneath them, so they carry no counts.
  const isTypeHeadingRow = (row: MonthlyHealthPromotionRow) => row.sessionTypeKey !== GRAND_TOTAL_KEY && !row.subject;

  const countCell = (row: MonthlyHealthPromotionRow, value: number, column?: (typeof AGE_GENDER_COLUMNS)[number]) =>
    value > 0 ? (
      <button className={pageStyles.linkCell} onClick={() => openDrilldown(row, value, column)}>
        {value}
      </button>
    ) : (
      value
    );

  const exportSheet = useMemo<ExportSheet>(() => {
    const toExportRow = (row: MonthlyHealthPromotionRow) => [
      row.sessionType,
      row.category ?? '',
      row.subject ?? '',
      ...AGE_GENDER_COLUMNS.map((col) => (isTypeHeadingRow(row) ? '' : (row.counts?.[col.key] ?? 0))),
      isTypeHeadingRow(row) ? '' : row.total,
    ];
    return {
      name: t('monthlyHealthPromotionReport', 'Monthly Health Promotion Report'),
      headers: [
        t('sessionType', 'Session type'),
        t('sessionCategory', 'Session category'),
        t('sessionSubject', 'Session subject'),
        ...AGE_GROUPS.flatMap((ageGroup) => [`${ageGroup} Male`, `${ageGroup} Female`]),
        t('total', 'Total'),
      ],
      rows: [
        ...bodyRows.map((row) => toExportRow(row)),
        ...(grandTotalRow ? [toExportRow(grandTotalRow)] : []),
      ],
    };
  }, [t, bodyRows, grandTotalRow]);

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>
          {t('monthlyHealthPromotionReportTitle', 'Monthly Health Promotion Report')}
        </h2>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField}>
            <label htmlFor="monthlyHealthPromotionStartDate">{t('startDate', 'Start Date')}</label>
            <input
              id="monthlyHealthPromotionStartDate"
              type="date"
              value={startDateInput}
              max={getTodayDateString()}
              onChange={(e) => setStartDateInput(clampToToday(e.target.value))}
            />
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="monthlyHealthPromotionEndDate">{t('endDate', 'End Date')}</label>
            <input
              id="monthlyHealthPromotionEndDate"
              type="date"
              value={endDateInput}
              max={getTodayDateString()}
              onChange={(e) => setEndDateInput(clampToToday(e.target.value))}
            />
          </div>
          <LocationFilter id="monthlyHealthPromotionLocationFilter" value={locationUuid} onChange={setLocationUuid} />
          <div className={pageStyles.filterField}>
            <label htmlFor="monthlyHealthPromotionSessionTypeFilter">{t('sessionType', 'Session type')}</label>
            <select
              id="monthlyHealthPromotionSessionTypeFilter"
              value={appliedSessionType}
              onChange={(e) => setAppliedSessionType(e.target.value)}
            >
              <option value="">{t('allSessionTypes', 'All session types')}</option>
              <option value="individual">{t('individualSessions', 'Individual Sessions')}</option>
              <option value="group">{t('groupSessions', 'Group Sessions')}</option>
              <option value="followUp">{t('followUpCases', 'Follow up cases')}</option>
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="monthlyHealthPromotionCategoryFilter">{t('sessionCategory', 'Session category')}</label>
            <select
              id="monthlyHealthPromotionCategoryFilter"
              value={appliedCategory}
              onChange={(e) => {
                setAppliedCategory(e.target.value);
                // The subject list follows the category, so a previously chosen subject may no longer apply.
                setAppliedSubject('');
              }}
            >
              <option value="">{t('allCategories', 'All categories')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="monthlyHealthPromotionSubjectFilter">{t('sessionSubject', 'Session subject')}</label>
            <select
              id="monthlyHealthPromotionSubjectFilter"
              value={appliedSubject}
              onChange={(e) => setAppliedSubject(e.target.value)}
            >
              <option value="">{t('allSubjects', 'All subjects')}</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="md"
            onClick={() => setApplied({ startDate: startDateInput || undefined, endDate: endDateInput || undefined })}
          >
            {t('filter', 'Filter')}
          </Button>
        </div>

        <ExportButtons
          filenameBase="monthly-health-promotion-report"
          mainSheet={exportSheet}
          extraSheets={[]}
          disabled={isLoading}
        />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th rowSpan={2} className="left">
                    {t('sessionType', 'Session type')}
                  </th>
                  <th rowSpan={2} className="left">
                    {t('sessionCategory', 'Session category')}
                  </th>
                  <th rowSpan={2} className="left">
                    {t('sessionSubject', 'Session subject')}
                  </th>
                  {AGE_GROUPS.map((ageGroup) => (
                    <th key={ageGroup} colSpan={2}>
                      {ageGroup} {t('year', 'Year')}
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
                {bodyRows.map((row) => (
                  <tr key={`${row.sessionTypeKey}|${row.category ?? ''}|${row.subject ?? ''}`}>
                    <td className="left">{row.subject ? '' : <strong>{row.sessionType}</strong>}</td>
                    <td className="left">{row.category}</td>
                    <td className="left">{row.subject}</td>
                    {AGE_GENDER_COLUMNS.map((col) => (
                      <td key={col.key}>
                        {isTypeHeadingRow(row) ? '' : countCell(row, row.counts?.[col.key] ?? 0, col)}
                      </td>
                    ))}
                    <td>{isTypeHeadingRow(row) ? '' : countCell(row, row.total)}</td>
                  </tr>
                ))}
              </tbody>
              {grandTotalRow && (
                <tfoot>
                  <tr>
                    <td className="left" colSpan={3}>
                      <strong>{t('grandTotal', 'Grand Total')}</strong>
                    </td>
                    {AGE_GENDER_COLUMNS.map((col) => (
                      <td key={col.key}>
                        <strong>{countCell(grandTotalRow, grandTotalRow.counts?.[col.key] ?? 0, col)}</strong>
                      </td>
                    ))}
                    <td>
                      <strong>{countCell(grandTotalRow, grandTotalRow.total)}</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

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
          {!patientsLoading && patients.length > 0 && selection.expectedCount !== patients.length && (
            <p>
              {t(
                'monthlyHealthPromotionDistinctPatientsNote',
                '{{patientCount}} patients. A patient who attended more than one session type or subject is counted once in this list, but once per row in the number you clicked ({{expected}}).',
                { patientCount: patients.length, expected: selection.expectedCount },
              )}
            </p>
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
                        {[patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(' ')}
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
