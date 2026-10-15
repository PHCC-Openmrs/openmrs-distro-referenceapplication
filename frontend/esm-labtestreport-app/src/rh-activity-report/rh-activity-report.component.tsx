import React, { Fragment, useMemo, useState } from 'react';
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

interface RhActivityRow {
  section: string;
  indicatorKey: string;
  label: string;
  // False for rows printed on the paper form that nothing in the system records yet.
  captured: boolean;
  counts: Record<string, number>;
  total: number;
}

// The backend always sends this row last; it's shown as the table footer rather than a section.
const TOTAL_PATIENTS_KEY = 'totalPatients';
const NOT_CAPTURED = '—';

const AGE_GROUPS = ['0-4', '5-14', '15-18', '19-49', '50-65', '65+'];
const AGE_GENDER_COLUMNS = AGE_GROUPS.flatMap((ageGroup) => [
  { key: `${ageGroup}_M`, ageGroup, genderCode: 'M', gender: 'Male' },
  { key: `${ageGroup}_F`, ageGroup, genderCode: 'F', gender: 'Female' },
]);

function useRhActivityReport(startDate?: string, endDate?: string, locationUuid?: string) {
  const search = new URLSearchParams();
  if (startDate) search.set('startDate', startDate);
  if (endDate) search.set('endDate', endDate);
  if (locationUuid) search.set('locationUuid', locationUuid);
  const query = search.toString();
  const url = `/module/labtestreport/api/rh-activity-report.json${query ? `?${query}` : ''}`;
  const { data, isLoading } = useSWR<{ data: RhActivityRow[] }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], isLoading };
}

interface Selection {
  indicatorKey: string;
  label: string;
  ageGroup?: string;
  gender?: string;
  cellLabel?: string;
  startDate?: string;
  endDate?: string;
  locationUuid?: string;
}

function useRhActivityDrilldown(selection: Selection | null) {
  const search = new URLSearchParams();
  if (selection) {
    search.set('indicatorKey', selection.indicatorKey);
    if (selection.ageGroup) search.set('ageGroup', selection.ageGroup);
    if (selection.gender) search.set('gender', selection.gender);
    if (selection.startDate) search.set('startDate', selection.startDate);
    if (selection.endDate) search.set('endDate', selection.endDate);
    if (selection.locationUuid) search.set('locationUuid', selection.locationUuid);
  }
  const url = selection ? `/module/labtestreport/api/rh-activity-drilldown.json?${search.toString()}` : null;
  const { data, isLoading } = useSWR<{ data: PatientRow[] }, Error>(url, openmrsFetch);
  return { patients: data?.data ?? [], isLoading };
}

export default function RhActivityReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [applied, setApplied] = useState<{ startDate?: string; endDate?: string }>({});
  const [locationUuid, setLocationUuid] = useState('');
  const { rows, isLoading } = useRhActivityReport(applied.startDate, applied.endDate, locationUuid || undefined);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { patients, isLoading: patientsLoading } = useRhActivityDrilldown(selection);

  const indicatorRows = useMemo(() => rows.filter((row) => row.indicatorKey !== TOTAL_PATIENTS_KEY), [rows]);
  const totalPatientsRow = useMemo(() => rows.find((row) => row.indicatorKey === TOTAL_PATIENTS_KEY), [rows]);

  // Consecutive rows sharing a section, in the order the backend sent them.
  const sections = useMemo(() => {
    const groups: Array<{ section: string; rows: RhActivityRow[] }> = [];
    indicatorRows.forEach((row) => {
      const last = groups[groups.length - 1];
      if (last && last.section === row.section) {
        last.rows.push(row);
      } else {
        groups.push({ section: row.section, rows: [row] });
      }
    });
    return groups;
  }, [indicatorRows]);

  const openDrilldown = (row: RhActivityRow, column?: (typeof AGE_GENDER_COLUMNS)[number]) =>
    setSelection({
      indicatorKey: row.indicatorKey,
      label: row.label,
      ageGroup: column?.ageGroup,
      gender: column?.genderCode,
      cellLabel: column ? `${column.ageGroup} ${column.gender}` : undefined,
      ...applied,
      locationUuid: locationUuid || undefined,
    });

  const countCell = (row: RhActivityRow, value: number, column?: (typeof AGE_GENDER_COLUMNS)[number]) => {
    if (!row.captured) {
      return <span title={t('notCapturedOnSrhForm', 'Not recorded on the SRH form')}>{NOT_CAPTURED}</span>;
    }
    return value > 0 ? (
      <button className={pageStyles.linkCell} onClick={() => openDrilldown(row, column)}>
        {value}
      </button>
    ) : (
      value
    );
  };

  const exportSheet = useMemo<ExportSheet>(() => {
    const toExportRow = (row: RhActivityRow) =>
      row.captured
        ? [row.label, ...AGE_GENDER_COLUMNS.map((col) => row.counts?.[col.key] ?? 0), row.total]
        : [row.label, ...AGE_GENDER_COLUMNS.map(() => NOT_CAPTURED), NOT_CAPTURED];
    return {
      name: t('rhActivityReport', 'RH Activity Report'),
      headers: [
        t('indicator', 'Indicator'),
        ...AGE_GROUPS.flatMap((ageGroup) => [`${ageGroup} Male`, `${ageGroup} Female`]),
        t('total', 'Total'),
      ],
      rows: [
        ...sections.flatMap((group) => [[group.section.toUpperCase()], ...group.rows.map(toExportRow)]),
        ...(totalPatientsRow ? [toExportRow(totalPatientsRow)] : []),
      ],
    };
  }, [t, sections, totalPatientsRow]);

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('rhActivityReportTitle', 'Reproductive Health Activity Report')}</h2>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField}>
            <label htmlFor="rhActivityStartDate">{t('startDate', 'Start Date')}</label>
            <input
              id="rhActivityStartDate"
              type="date"
              value={startDateInput}
              max={getTodayDateString()}
              onChange={(e) => setStartDateInput(clampToToday(e.target.value))}
            />
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="rhActivityEndDate">{t('endDate', 'End Date')}</label>
            <input
              id="rhActivityEndDate"
              type="date"
              value={endDateInput}
              max={getTodayDateString()}
              onChange={(e) => setEndDateInput(clampToToday(e.target.value))}
            />
          </div>
          <LocationFilter id="rhActivityLocationFilter" value={locationUuid} onChange={setLocationUuid} />
          <Button
            size="md"
            onClick={() => setApplied({ startDate: startDateInput || undefined, endDate: endDateInput || undefined })}
          >
            {t('filter', 'Filter')}
          </Button>
        </div>

        <ExportButtons filenameBase="rh-activity-report" mainSheet={exportSheet} extraSheets={[]} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th rowSpan={2} className="left">
                    {t('indicator', 'Indicator')}
                  </th>
                  {AGE_GROUPS.map((ageGroup) => (
                    <th key={ageGroup} colSpan={2}>
                      {ageGroup}
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
                {sections.map((group) => (
                  <Fragment key={group.section}>
                    <tr className={pageStyles.dayHeaderRow}>
                      <td colSpan={AGE_GENDER_COLUMNS.length + 2}>{group.section.toUpperCase()}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.indicatorKey}>
                        <td className="left">{row.label}</td>
                        {AGE_GENDER_COLUMNS.map((col) => (
                          <td key={col.key}>{countCell(row, row.counts?.[col.key] ?? 0, col)}</td>
                        ))}
                        <td>{countCell(row, row.total)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              {totalPatientsRow && (
                <tfoot>
                  <tr>
                    <td className="left">
                      <strong>{totalPatientsRow.label}</strong>
                    </td>
                    {AGE_GENDER_COLUMNS.map((col) => (
                      <td key={col.key}>
                        <strong>{countCell(totalPatientsRow, totalPatientsRow.counts?.[col.key] ?? 0, col)}</strong>
                      </td>
                    ))}
                    <td>
                      <strong>{countCell(totalPatientsRow, totalPatientsRow.total)}</strong>
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
