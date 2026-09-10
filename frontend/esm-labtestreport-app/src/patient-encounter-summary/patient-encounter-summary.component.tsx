import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, Button, ContentSwitcher, Search, Switch, Tag, NumberInput } from '@carbon/react';
import { ChevronDown, ChevronRight } from '@carbon/react/icons';
import { navigate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import SimpleBarChart from '../reports-shell/simple-bar-chart.component';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import MonthCompareControls from '../reports-shell/month-compare-controls.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import { buildKpiExportSheet, type ExportSheet } from '../reports-shell/export-utils';
import { useMonthComparison } from '../reports-shell/month-compare';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import {
  usePatientEncounterDetails,
  usePatientEncounterSummary,
  type PatientEncounterDetailRow,
  type PatientEncounterSummaryRow,
} from './patient-encounter-summary.resource';

// `serviceType` (on both endpoints) and `location` (summary only) are comma-joined lists -- a
// visit can be recorded for more than one service, and a patient can visit more than one
// location within the report period.
function splitCommaList(value: string | null | undefined): Array<string> {
  return (value ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueSorted(values: Array<string>): Array<string> {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function formatFullName(row: Pick<PatientEncounterSummaryRow, 'givenName' | 'middleName' | 'familyName'>): string {
  return [row.givenName, row.middleName, row.familyName].filter(Boolean).join(' ');
}

interface VisitFilters {
  minAge: number | '';
  maxAge: number | '';
  location: string;
  serviceType: string;
  searchTerm: string;
}

/** One expandable table row: a patient plus the (filtered) visits nested under them. */
interface PatientVisitGroup {
  patientId: number;
  patientUuid: string;
  fullName: string;
  sex: string;
  nationalId: string;
  phoneNumber: string;
  age: number | null;
  visitCount: number;
  mostRecentVisitDate: string;
  services: Array<string>;
  visits: Array<PatientEncounterDetailRow>;
}

/**
 * Filters visits (rather than patients) against the age/location/service/search controls, then
 * groups the surviving visits by patient. This is the visit-grained replacement for the old
 * per-patient summary table: a patient's visit count and "most recent visit" now reflect only the
 * visits that matched the current filters, and filtering by service or location can no longer
 * leave a patient's other, unrelated visits mixed into their row (see service-selector.component
 * in esm-patient-chart-app -- a visit can now carry more than one service, so the two need to be
 * told apart at the visit, not the patient).
 */
function buildPatientGroups(
  detailRows: Array<PatientEncounterDetailRow>,
  patientById: Map<number, PatientEncounterSummaryRow>,
  filters: VisitFilters,
): { groups: Array<PatientVisitGroup>; visitCount: number; mostRecentDate: string | null } {
  const term = filters.searchTerm.trim().toLowerCase();

  const filteredVisits = detailRows.filter((visit) => {
    const patient = patientById.get(visit.patientId);
    const age = patient?.age;
    if (filters.minAge !== '' && (age == null || age < filters.minAge)) {
      return false;
    }
    if (filters.maxAge !== '' && (age == null || age > filters.maxAge)) {
      return false;
    }
    if (filters.location && visit.locationName !== filters.location) {
      return false;
    }
    if (filters.serviceType && !splitCommaList(visit.serviceType).includes(filters.serviceType)) {
      return false;
    }
    if (term) {
      const haystack = [
        patient?.givenName,
        patient?.middleName,
        patient?.familyName,
        patient?.nationalId,
        patient?.phoneNumber,
        visit.locationName,
        visit.serviceType,
        visit.providerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const byPatient = new Map<number, Array<PatientEncounterDetailRow>>();
  for (const visit of filteredVisits) {
    const existing = byPatient.get(visit.patientId);
    if (existing) {
      existing.push(visit);
    } else {
      byPatient.set(visit.patientId, [visit]);
    }
  }

  const groups: Array<PatientVisitGroup> = [];
  for (const [patientId, visits] of byPatient) {
    const patient = patientById.get(patientId);
    groups.push({
      patientId,
      patientUuid: patient?.patientUuid ?? visits[0].patientUuid,
      fullName: patient ? formatFullName(patient) : `${visits[0].givenName} ${visits[0].familyName}`.trim(),
      sex: patient?.sex ?? '',
      nationalId: patient?.nationalId ?? '',
      phoneNumber: patient?.phoneNumber ?? '',
      age: patient?.age ?? null,
      visitCount: visits.length,
      mostRecentVisitDate: visits.reduce((latest, v) => (v.visitDate > latest ? v.visitDate : latest), visits[0].visitDate),
      services: uniqueSorted(visits.flatMap((v) => splitCommaList(v.serviceType))),
      visits,
    });
  }

  const mostRecentDate = filteredVisits.reduce<string | null>(
    (latest, visit) => (!latest || visit.visitDate > latest ? visit.visitDate : latest),
    null,
  );

  return { groups, visitCount: filteredVisits.length, mostRecentDate };
}

function ServiceTags({ services }: { services: Array<string> }) {
  if (!services.length) {
    return <>{'--'}</>;
  }
  return (
    <>
      {services.map((service) => (
        <Tag type="blue" size="sm" key={service}>
          {service}
        </Tag>
      ))}
    </>
  );
}

export default function PatientEncounterSummaryReport() {
  const { t } = useTranslation();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [minAge, setMinAge] = useState<number | ''>('');
  const [maxAge, setMaxAge] = useState<number | ''>('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(new Set());
  const compare = useMonthComparison();

  const primaryStartDate = compare.enabled ? compare.primary.startDate : appliedDates.startDate;
  const primaryEndDate = compare.enabled ? compare.primary.endDate : appliedDates.endDate;

  const { rows, isLoading } = usePatientEncounterSummary(primaryStartDate, primaryEndDate);
  const { rows: compareRowsRaw, isLoading: compareLoading } = usePatientEncounterSummary(
    compare.comparison.startDate,
    compare.comparison.endDate,
    compare.enabled,
  );

  const { rows: detailRows, isLoading: detailsLoading } = usePatientEncounterDetails(
    primaryStartDate,
    primaryEndDate,
  );
  const { rows: compareDetailRows, isLoading: compareDetailsLoading } = usePatientEncounterDetails(
    compare.comparison.startDate,
    compare.comparison.endDate,
    compare.enabled,
  );

  const dataLoading =
    isLoading || detailsLoading || (compare.enabled && (compareLoading || compareDetailsLoading));

  const patientById = useMemo(() => new Map(rows.map((row) => [row.patientId, row])), [rows]);
  const comparePatientById = useMemo(
    () => new Map(compareRowsRaw.map((row) => [row.patientId, row])),
    [compareRowsRaw],
  );

  const filters = useMemo<VisitFilters>(
    () => ({ minAge, maxAge, location: selectedLocation, serviceType: selectedServiceType, searchTerm }),
    [minAge, maxAge, selectedLocation, selectedServiceType, searchTerm],
  );

  const primary = useMemo(() => buildPatientGroups(detailRows, patientById, filters), [detailRows, patientById, filters]);
  const { groups: patientGroups } = primary;

  // The comparison period only ever feeds the KPI tiles' "vs" line below, never its own table --
  // it's filtered identically so that comparison stays apples-to-apples with the primary period.
  const compareSummary = useMemo(
    () =>
      compare.enabled ? buildPatientGroups(compareDetailRows, comparePatientById, filters) : null,
    [compare.enabled, compareDetailRows, comparePatientById, filters],
  );

  const locationOptions = useMemo(
    () => uniqueSorted(detailRows.map((row) => row.locationName).filter(Boolean)),
    [detailRows],
  );
  const serviceTypeOptions = useMemo(
    () => uniqueSorted(detailRows.flatMap((row) => splitCommaList(row.serviceType))),
    [detailRows],
  );

  const sortAccessors = useMemo(
    () => ({
      name: (row: PatientVisitGroup) => row.fullName,
      sex: (row: PatientVisitGroup) => row.sex ?? '',
      nationalId: (row: PatientVisitGroup) => row.nationalId ?? '',
      phoneNumber: (row: PatientVisitGroup) => row.phoneNumber ?? '',
      age: (row: PatientVisitGroup) => row.age,
      visitCount: (row: PatientVisitGroup) => row.visitCount,
      mostRecentVisitDate: (row: PatientVisitGroup) => row.mostRecentVisitDate,
    }),
    [],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(patientGroups, sortAccessors, null);

  const chartData = useMemo(
    () => patientGroups.map((group) => ({ label: group.fullName, value: group.visitCount })),
    [patientGroups],
  );

  const kpiItems = useMemo(() => {
    const totalPatients = patientGroups.length;
    const totalVisits = primary.visitCount;
    const items = [
      { label: t('totalPatients', 'Total Patients'), value: totalPatients },
      { label: t('totalVisits', 'Total Visits'), value: totalVisits },
      {
        label: t('avgVisitsPerPatient', 'Avg Visits / Patient'),
        value: totalPatients > 0 ? (totalVisits / totalPatients).toFixed(1) : '0',
      },
      { label: t('mostRecentVisit', 'Most Recent Visit'), value: primary.mostRecentDate ?? '—' },
    ];
    if (!compare.enabled || !compareSummary) {
      return items;
    }
    const compareTotalPatients = compareSummary.groups.length;
    const compareValues: Array<React.ReactNode> = [
      compareTotalPatients,
      compareSummary.visitCount,
      compareTotalPatients > 0 ? (compareSummary.visitCount / compareTotalPatients).toFixed(1) : '0',
      compareSummary.mostRecentDate ?? '—',
    ];
    return items.map((item, index) => ({
      ...item,
      compareValue: compareValues[index],
      compareLabel: compare.comparison.label,
    }));
  }, [t, patientGroups, primary, compare.enabled, compareSummary, compare.comparison.label]);

  const mainExportSheet = useMemo<ExportSheet>(() => {
    // Visit-grained, one row per visible visit -- matches what's on screen, unlike the old
    // per-patient sheet where a service/location filter kept a patient's unrelated visits mixed
    // into the same row (see buildPatientGroups).
    const visitRows = sortedRows.flatMap((group) => group.visits.map((visit) => ({ group, visit })));
    return {
      name: t('patientVisitSummary', 'Patient Visit Summary'),
      headers: [
        t('givenName', 'Given Name'),
        t('familyName', 'Family Name'),
        t('sex', 'Sex'),
        t('nationalId', 'National ID'),
        t('phoneNumber', 'Phone Number'),
        t('age', 'Age'),
        t('visitDate', 'Visit Date'),
        t('location', 'Location'),
        t('serviceType', 'Service Type'),
        t('provider', 'Provider'),
      ],
      rows: visitRows.map(({ group, visit }) => {
        const patient = patientById.get(group.patientId);
        return [
          patient?.givenName ?? '',
          patient?.familyName ?? '',
          group.sex,
          group.nationalId,
          group.phoneNumber,
          group.age ?? '',
          visit.visitDate,
          visit.locationName,
          visit.serviceType,
          visit.providerName,
        ];
      }),
    };
  }, [t, sortedRows, patientById]);

  const exportExtraSheets = useMemo<Array<ExportSheet>>(
    () => (compare.enabled ? [buildKpiExportSheet(kpiItems, t)] : []),
    [compare.enabled, kpiItems, t],
  );

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  function goToPatientChart(patientUuid: string) {
    navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/visits` });
  }

  function toggleExpanded(patientId: number) {
    setExpandedPatients((previous) => {
      const next = new Set(previous);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedPatients(new Set(patientGroups.map((group) => group.patientId)));
  }

  function collapseAll() {
    setExpandedPatients(new Set());
  }

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>
          {t('patientVisitSummaryReportTitle', 'Patient Visit Summary Report')}
        </h2>

        {!dataLoading && <KpiTiles items={kpiItems} />}

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
            <Button size="md" onClick={applyFilter}>
              {t('filter', 'Filter')}
            </Button>
          </div>
        )}

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField} style={{ minWidth: '10rem' }}>
            <NumberInput
              id="minAge"
              label={t('minAge', 'Min Age')}
              size="md"
              value={minAge}
              min={0}
              allowEmpty
              onChange={(_e, { value }) => setMinAge(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '10rem' }}>
            <NumberInput
              id="maxAge"
              label={t('maxAge', 'Max Age')}
              size="md"
              value={maxAge}
              min={0}
              allowEmpty
              onChange={(_e, { value }) => setMaxAge(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="locationFilter">{t('location', 'Location')}</label>
            <select
              id="locationFilter"
              value={selectedLocation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLocation(e.target.value)}
            >
              <option value="">{t('all', 'All')}</option>
              {locationOptions.map((location: string) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="serviceTypeFilter">{t('serviceType', 'Service Type')}</label>
            <select
              id="serviceTypeFilter"
              value={selectedServiceType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedServiceType(e.target.value)}
            >
              <option value="">{t('all', 'All')}</option>
              {serviceTypeOptions.map((serviceType: string) => (
                <option key={serviceType} value={serviceType}>
                  {serviceType}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchAllColumnsPlaceholder', 'Search name, ID, phone, location...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
        </div>

        <ExportButtons
          filenameBase="patient-visit-summary-report"
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
          <>
            <div className={pageStyles.tableActions}>
              <Button kind="ghost" size="sm" onClick={expandAll}>
                {t('expandAll', 'Expand all')}
              </Button>
              <Button kind="ghost" size="sm" onClick={collapseAll}>
                {t('collapseAll', 'Collapse all')}
              </Button>
            </div>
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
                      label={t('sex', 'Sex')}
                      sortKey="sex"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      className="left"
                    />
                    <SortableHeader
                      label={t('nationalId', 'National ID')}
                      sortKey="nationalId"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      className="left"
                    />
                    <SortableHeader
                      label={t('phoneNumber', 'Phone Number')}
                      sortKey="phoneNumber"
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
                      label={t('numberOfVisits', 'Number of Visits')}
                      sortKey="visitCount"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label={t('mostRecentVisitDate', 'Most Recent Visit Date')}
                      sortKey="mostRecentVisitDate"
                      activeSortKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <th className="left">{t('serviceType', 'Service Type')}</th>
                    <th className="left">{t('location', 'Location')}</th>
                    <th className="left">{t('provider', 'Provider')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((group) => {
                    const expanded = expandedPatients.has(group.patientId);
                    return (
                      <React.Fragment key={group.patientId}>
                        <tr className={pageStyles.categoryHeaderRow} onClick={() => toggleExpanded(group.patientId)}>
                          <td className="left">
                            <button className={pageStyles.collapseToggle} aria-expanded={expanded}>
                              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              {group.fullName}
                            </button>
                          </td>
                          <td className="left">{group.sex}</td>
                          <td className="left">{group.nationalId}</td>
                          <td className="left">{group.phoneNumber}</td>
                          <td>{group.age}</td>
                          <td>{group.visitCount}</td>
                          <td>{group.mostRecentVisitDate}</td>
                          <td className="left">
                            <ServiceTags services={group.services} />
                          </td>
                          <td className="left" />
                          <td className="left" />
                        </tr>
                        {expanded &&
                          group.visits.map((visit) => (
                            <tr
                              className={`${pageStyles.detailRow} ${pageStyles.clickableRow}`}
                              key={visit.visitId}
                              onClick={() => goToPatientChart(group.patientUuid)}
                            >
                              <td className={`left ${pageStyles.nestedCell}`}>{visit.visitDate}</td>
                              <td className="left" />
                              <td className="left" />
                              <td className="left" />
                              <td />
                              <td />
                              <td />
                              <td className="left">
                                <ServiceTags services={splitCommaList(visit.serviceType)} />
                              </td>
                              <td className="left">{visit.locationName || '--'}</td>
                              <td className="left">{visit.providerName || '--'}</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className={pageStyles.emptyState}>
                        {t('noPatientsForSelection', 'No patients found for this selection.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!dataLoading && viewMode === 'graph' && (
          <SimpleBarChart
            data={chartData}
            emptyMessage={t('noPatientsForSelection', 'No patients found for this selection.')}
          />
        )}
      </div>
    </div>
  );
}
