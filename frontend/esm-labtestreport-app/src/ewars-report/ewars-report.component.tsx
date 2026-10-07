import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, Modal } from '@carbon/react';
import { navigate, openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet } from '../reports-shell/export-utils';
import pageStyles from '../reports-shell/reports-page.scss';
import type { PatientRow } from '../disease-summary/disease-summary.resource';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';

interface EwarsRow {
  diagnosisLabel: string;
  counts: Record<string, number>;
  total: number;
}

const AGE_GROUPS = ['0-4', '5-14', '15-18', '19-49', '50-65', '65+'];
const AGE_GENDER_COLUMNS = AGE_GROUPS.flatMap((ageGroup) => [
  { key: `${ageGroup}_M`, gender: 'Male' },
  { key: `${ageGroup}_F`, gender: 'Female' },
]);

function useEwarsReport(startDate?: string, endDate?: string) {
  const search = new URLSearchParams();
  if (startDate) search.set('startDate', startDate);
  if (endDate) search.set('endDate', endDate);
  const query = search.toString();
  const url = `/module/labtestreport/api/ewars-report.json${query ? `?${query}` : ''}`;
  const { data, isLoading } = useSWR<{ data: EwarsRow[] }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], isLoading };
}

interface Selection {
  diagnosisLabel: string;
  ageGroup?: string;
  gender?: string;
  ageGroupLabel?: string;
  startDate?: string;
  endDate?: string;
}

function useEwarsDrilldown(selection: Selection | null) {
  const search = new URLSearchParams();
  if (selection) {
    search.set('diagnosisLabel', selection.diagnosisLabel);
    if (selection.ageGroup) search.set('ageGroup', selection.ageGroup);
    if (selection.gender) search.set('gender', selection.gender);
    if (selection.startDate) search.set('startDate', selection.startDate);
    if (selection.endDate) search.set('endDate', selection.endDate);
  }
  const url = selection ? `/module/labtestreport/api/ewars-drilldown.json?${search.toString()}` : null;
  const { data, isLoading } = useSWR<{ data: PatientRow[] }, Error>(url, openmrsFetch);
  return { patients: data?.data ?? [], isLoading };
}

export default function EwarsReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [applied, setApplied] = useState<{ startDate?: string; endDate?: string }>({});
  const { rows, isLoading } = useEwarsReport(applied.startDate, applied.endDate);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { patients, isLoading: patientsLoading } = useEwarsDrilldown(selection);

  const openDrilldown = (diagnosisLabel: string, ageGroup?: string, gender?: string, ageGroupLabel?: string) =>
    setSelection({ diagnosisLabel, ageGroup, gender, ageGroupLabel, ...applied });

  const countCell = (value: number, onClick: () => void) =>
    value > 0 ? (
      <button className={pageStyles.linkCell} onClick={onClick}>
        {value}
      </button>
    ) : (
      value
    );

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    AGE_GENDER_COLUMNS.forEach((col) => (totals[col.key] = rows.reduce((sum, row) => sum + (row.counts?.[col.key] ?? 0), 0)));
    return totals;
  }, [rows]);
  const grandTotal = useMemo(() => rows.reduce((sum, row) => sum + row.total, 0), [rows]);

  const exportSheet = useMemo<ExportSheet>(
    () => ({
      name: t('ewarsReport', 'EWARS Report'),
      headers: [
        t('diagnosis', 'Diagnosis'),
        ...AGE_GROUPS.flatMap((ageGroup) => [`${ageGroup} Male`, `${ageGroup} Female`]),
        t('total', 'Total'),
      ],
      rows: [
        ...rows.map((row) => [
          row.diagnosisLabel,
          ...AGE_GENDER_COLUMNS.map((col) => row.counts?.[col.key] ?? 0),
          row.total,
        ]),
        [t('total', 'Total'), ...AGE_GENDER_COLUMNS.map((col) => columnTotals[col.key]), grandTotal],
      ],
    }),
    [t, rows, columnTotals, grandTotal],
  );

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('ewarsReportTitle', 'EWARS Report')}</h2>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField}>
            <label htmlFor="ewarsStartDate">{t('startDate', 'Start Date')}</label>
            <input
              id="ewarsStartDate"
              type="date"
              value={startDateInput}
              max={getTodayDateString()}
              onChange={(e) => setStartDateInput(clampToToday(e.target.value))}
            />
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="ewarsEndDate">{t('endDate', 'End Date')}</label>
            <input
              id="ewarsEndDate"
              type="date"
              value={endDateInput}
              max={getTodayDateString()}
              onChange={(e) => setEndDateInput(clampToToday(e.target.value))}
            />
          </div>
          <Button
            size="md"
            onClick={() => setApplied({ startDate: startDateInput || undefined, endDate: endDateInput || undefined })}
          >
            {t('filter', 'Filter')}
          </Button>
        </div>

        <ExportButtons filenameBase="ewars-report" mainSheet={exportSheet} extraSheets={[]} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <th rowSpan={2} className="left">
                    {t('diagnosis', 'Diagnosis')}
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
                {rows.map((row) => (
                  <tr key={row.diagnosisLabel}>
                    <td className="left">{row.diagnosisLabel}</td>
                    {AGE_GENDER_COLUMNS.map((col) => (
                      <td key={col.key}>
                        {countCell(row.counts?.[col.key] ?? 0, () =>
                          openDrilldown(
                            row.diagnosisLabel,
                            col.key.split('_')[0],
                            col.key.split('_')[1],
                            `${col.key.split('_')[0]} ${col.gender}`,
                          ),
                        )}
                      </td>
                    ))}
                    <td>{countCell(row.total, () => openDrilldown(row.diagnosisLabel))}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="left">
                      <strong>{t('total', 'Total')}</strong>
                    </td>
                    {AGE_GENDER_COLUMNS.map((col) => (
                      <td key={col.key}>
                        <strong>{columnTotals[col.key]}</strong>
                      </td>
                    ))}
                    <td>
                      <strong>{grandTotal}</strong>
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
          modalHeading={`${selection.diagnosisLabel}${selection.ageGroupLabel ? ` » ${selection.ageGroupLabel}` : ''}`}
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
