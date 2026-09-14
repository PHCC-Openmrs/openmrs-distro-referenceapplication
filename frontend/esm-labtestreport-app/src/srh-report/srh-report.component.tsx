import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ContentSwitcher, InlineLoading, Search, Select, SelectItem, Switch } from '@carbon/react';
import { navigate, useLocations } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import KpiTiles, { type KpiTileDatum } from '../reports-shell/kpi-tiles.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import type { ExportSheet, Translate } from '../reports-shell/export-utils';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import { useSrhReport, type SrhReportRow, type SrhSection } from './srh-report.resource';

const LOCATION_TAG = 'Login Location';

const SECTIONS: Array<SrhSection> = ['ultrasound', 'stiGynaecology', 'familyPlanning'];

const SEARCHABLE_FIELDS: Array<keyof SrhReportRow> = [
  'givenName',
  'middleName',
  'familyName',
  'location',
  'presentation',
  'fetalGender',
  'amnioticFluid',
  'referrals',
  'sti',
  'gynaecology',
  'contraceptionKind',
  'familyPlanningVisitType',
];

/**
 * One column of the section currently on screen. The three SRH sections record completely
 * different things, so each declares its own columns and a single table renders whichever set is
 * active -- which also keeps sorting and the export in step with what's actually displayed.
 */
interface SectionColumn {
  key: string;
  label: string;
  /** Sort value, and the displayed value unless `render` says otherwise. */
  accessor: (row: SrhReportRow) => string | number | null;
  render?: (row: SrhReportRow) => React.ReactNode;
  /** Export value, when `accessor` alone doesn't carry what `render` puts on screen. */
  exportAccessor?: (row: SrhReportRow) => string | number | null;
  left?: boolean;
  sortable?: boolean;
}

function patientName(row: SrhReportRow): string {
  return `${row.givenName} ${row.middleName ? `${row.middleName} ` : ''}${row.familyName}`.replace(/\s+/g, ' ').trim();
}

/** Weeks and days are recorded as two obs but only mean anything read together. */
function formatGestationalAge(row: SrhReportRow, t: Translate): string {
  if (row.gestationalAgeWeeks === null && row.gestationalAgeDays === null) {
    return '--';
  }
  return t('weeksAndDays', '{{weeks}}w {{days}}d', {
    weeks: row.gestationalAgeWeeks ?? 0,
    days: row.gestationalAgeDays ?? 0,
  });
}

function display(value: string | number | null): string {
  return value === null || value === '' ? '--' : String(value);
}

export default function SrhReport() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SrhSection>('ultrasound');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [locationUuid, setLocationUuid] = useState('');
  const locations = useLocations(LOCATION_TAG);

  const { rows, isLoading } = useSrhReport(
    appliedDates.startDate,
    appliedDates.endDate,
    locationUuid || undefined,
    section,
  );

  const sectionLabels: Record<SrhSection, string> = useMemo(
    () => ({
      ultrasound: t('srhUltrasound', 'Ultrasound'),
      stiGynaecology: t('srhStiGynaecology', 'STI and Gynaecology'),
      familyPlanning: t('srhFamilyPlanning', 'Family Planning'),
    }),
    [t],
  );

  // Patient identity, recorded on every SRH encounter whatever the section.
  const commonColumns = useMemo<Array<SectionColumn>>(
    () => [
      { key: 'name', label: t('patientName', 'Patient Name'), accessor: patientName, left: true },
      { key: 'encounterDatetime', label: t('encounterDate', 'Encounter Date'), accessor: (row) => row.encounterDatetime },
      { key: 'location', label: t('location', 'Location'), accessor: (row) => row.location, left: true },
      { key: 'age', label: t('age', 'Age'), accessor: (row) => row.age },
      { key: 'gender', label: t('gender', 'Gender'), accessor: (row) => row.gender },
    ],
    [t],
  );

  const sectionColumns = useMemo<Record<SrhSection, Array<SectionColumn>>>(
    () => ({
      ultrasound: [
        { key: 'fetuses', label: t('fetuses', 'Fetuses'), accessor: (row) => row.fetuses },
        {
          key: 'fetalHeartPulsation',
          label: t('fetalHeartPulsation', 'Fetal Heart Pulsation'),
          accessor: (row) => row.fetalHeartPulsation,
        },
        { key: 'presentation', label: t('presentation', 'Presentation'), accessor: (row) => row.presentation },
        { key: 'lieFetuses', label: t('lieFetuses', 'Lie'), accessor: (row) => row.lieFetuses },
        { key: 'fetalGender', label: t('fetalGender', 'Fetal Gender'), accessor: (row) => row.fetalGender },
        { key: 'femurLength', label: t('femurLength', 'FL (mm)'), accessor: (row) => row.femurLength },
        { key: 'crownRumpLength', label: t('crownRumpLength', 'CRL (mm)'), accessor: (row) => row.crownRumpLength },
        {
          key: 'biparietalDiameter',
          label: t('biparietalDiameter', 'BPD (mm)'),
          accessor: (row) => row.biparietalDiameter,
        },
        {
          key: 'abdominalCircumference',
          label: t('abdominalCircumference', 'AC (mm)'),
          accessor: (row) => row.abdominalCircumference,
        },
        {
          key: 'gestationalAge',
          label: t('gestationalAge', 'Gestational Age'),
          accessor: (row) => row.gestationalAgeWeeks,
          render: (row) => formatGestationalAge(row, t),
          exportAccessor: (row) => formatGestationalAge(row, t),
        },
        { key: 'placenta', label: t('placenta', 'Placenta'), accessor: (row) => row.placenta, left: true },
        { key: 'amnioticFluid', label: t('amnioticFluid', 'Amniotic Fluid'), accessor: (row) => row.amnioticFluid },
        {
          key: 'expectedDateOfDelivery',
          label: t('expectedDateOfDelivery', 'EDD'),
          accessor: (row) => row.expectedDateOfDelivery,
        },
        { key: 'weeksSinceLmp', label: t('weeksSinceLmp', 'Weeks Since LMP'), accessor: (row) => row.weeksSinceLmp },
        { key: 'referrals', label: t('referrals', 'Referrals'), accessor: (row) => row.referrals, left: true },
        {
          key: 'ultrasoundNotes',
          label: t('notes', 'Notes'),
          accessor: (row) => row.ultrasoundNotes,
          left: true,
          sortable: false,
        },
      ],
      stiGynaecology: [
        { key: 'pncTiming', label: t('pncTiming', 'PNC'), accessor: (row) => row.pncTiming },
        { key: 'sti', label: t('sti', 'STI'), accessor: (row) => row.sti },
        { key: 'gynaecology', label: t('gynaecology', 'Gynaecology'), accessor: (row) => row.gynaecology },
        {
          key: 'preConceptionCare',
          label: t('preConceptionCare', 'Pre-Conception Care'),
          accessor: (row) => row.preConceptionCare,
        },
        {
          key: 'stiGynaecologyNotes',
          label: t('notes', 'Notes'),
          accessor: (row) => row.stiGynaecologyNotes,
          left: true,
          sortable: false,
        },
      ],
      familyPlanning: [
        {
          key: 'familyPlanningVisitType',
          label: t('visitType', 'Visit Type'),
          accessor: (row) => row.familyPlanningVisitType,
        },
        {
          key: 'contraceptionKind',
          label: t('contraceptionKind', 'Kind of Contraception'),
          accessor: (row) => row.contraceptionKind,
          left: true,
        },
        {
          key: 'familyPlanningNotes',
          label: t('notes', 'Notes'),
          accessor: (row) => row.familyPlanningNotes,
          left: true,
          sortable: false,
        },
      ],
    }),
    [t],
  );

  const columns = useMemo(
    () => [...commonColumns, ...sectionColumns[section]],
    [commonColumns, sectionColumns, section],
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
    () =>
      Object.fromEntries(
        columns.filter((column) => column.sortable !== false).map((column) => [column.key, column.accessor]),
      ),
    [columns],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(
    searchedRows,
    sortAccessors,
    'encounterDatetime',
  );

  const kpiItems = useMemo<Array<KpiTileDatum>>(() => {
    const base: Array<KpiTileDatum> = [
      { label: t('totalRecords', 'Total Records'), value: searchedRows.length },
      { label: t('uniquePatients', 'Unique Patients'), value: new Set(searchedRows.map((row) => row.patientId)).size },
    ];

    if (section === 'ultrasound') {
      const withGestationalAge = searchedRows.filter((row) => row.gestationalAgeWeeks !== null);
      return [
        ...base,
        { label: t('referralsMade', 'Referrals Made'), value: searchedRows.filter((row) => Boolean(row.referrals)).length },
        {
          label: t('averageGestationalAgeWeeks', 'Avg Gestational Age (weeks)'),
          value: withGestationalAge.length
            ? (
                withGestationalAge.reduce((sum, row) => sum + (row.gestationalAgeWeeks ?? 0), 0) /
                withGestationalAge.length
              ).toFixed(1)
            : '--',
        },
      ];
    }

    if (section === 'stiGynaecology') {
      return [
        ...base,
        { label: t('stiCases', 'STI Cases'), value: searchedRows.filter((row) => row.sti === 'Yes').length },
        {
          label: t('gynaecologyCases', 'Gynaecology Cases'),
          value: searchedRows.filter((row) => row.gynaecology === 'Yes').length,
        },
        {
          label: t('preConceptionCareCases', 'Pre-Conception Care'),
          value: searchedRows.filter((row) => row.preConceptionCare === 'Yes').length,
        },
        { label: t('pncVisits', 'PNC Visits'), value: searchedRows.filter((row) => Boolean(row.pncTiming)).length },
      ];
    }

    return [
      ...base,
      {
        label: t('newVisits', 'New Visits'),
        value: searchedRows.filter((row) => row.familyPlanningVisitType === 'New').length,
      },
      {
        label: t('followUpVisits', 'Follow-up Visits'),
        value: searchedRows.filter((row) => row.familyPlanningVisitType === 'Follow').length,
      },
    ];
  }, [t, searchedRows, section]);

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: sectionLabels[section],
      headers: columns.map((column) => column.label),
      rows: searchedRows.map((row) =>
        columns.map((column) => (column.exportAccessor ?? column.accessor)(row) ?? ''),
      ),
    }),
    [columns, searchedRows, section, sectionLabels],
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
        <h2 className={pageStyles.pageHeading}>{t('srhReportTitle', 'SRH Report')}</h2>
        <p className={pageStyles.pageSubtitle}>
          {t(
            'srhReportSubtitle',
            'Sexual Reproductive Health records, by section. Click a row to open that patient’s chart.',
          )}
        </p>

        {!isLoading && <KpiTiles items={kpiItems} />}

        <div className={pageStyles.viewSwitcher}>
          <ContentSwitcher
            size="md"
            selectedIndex={SECTIONS.indexOf(section)}
            onChange={({ name }) => setSection(name as SrhSection)}
          >
            {SECTIONS.map((sectionKey) => (
              <Switch key={sectionKey} name={sectionKey} text={sectionLabels[sectionKey]} />
            ))}
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
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchSrhPlaceholder', 'Search name, location, finding...')}
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
          filenameBase={`srh-report-${section}`}
          mainSheet={mainExportSheet}
          disabled={isLoading}
        />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  {columns.map((column) =>
                    column.sortable === false ? (
                      <th key={column.key} className={column.left ? 'left' : undefined}>
                        {column.label}
                      </th>
                    ) : (
                      // Wrapped so the list key lives on an element that accepts one -- the same
                      // workaround the location <SelectItem> lists in these reports already use.
                      <React.Fragment key={column.key}>
                        <SortableHeader
                          label={column.label}
                          sortKey={column.key}
                          activeSortKey={sortKey}
                          direction={direction}
                          onSort={toggleSort}
                          className={column.left ? 'left' : undefined}
                        />
                      </React.Fragment>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.encounterId}
                    className={pageStyles.clickableRow}
                    onClick={() => goToPatientChart(row.patientUuid)}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={column.left ? 'left' : undefined}>
                        {column.render ? column.render(row) : display(column.accessor(row))}
                      </td>
                    ))}
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className={pageStyles.emptyState}>
                      {t('noSrhRecordsForSelection', 'No SRH records found for this selection.')}
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
