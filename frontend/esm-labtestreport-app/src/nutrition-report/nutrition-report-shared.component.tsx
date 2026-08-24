import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, Button, Search, NumberInput } from '@carbon/react';
import { navigate } from '@openmrs/esm-framework';
import BackToReportsLink from '../reports-shell/back-to-reports-link.component';
import ExportButtons from '../reports-shell/export-buttons.component';
import { type ExportSheet } from '../reports-shell/export-utils';
import KpiTiles from '../reports-shell/kpi-tiles.component';
import SortableHeader from '../reports-shell/sortable-header.component';
import { useSortableRows } from '../reports-shell/use-sortable-rows';
import pageStyles from '../reports-shell/reports-page.scss';
import { getTodayDateString, clampToToday } from '../reports-shell/date-utils';
import {
  useNutritionFilterOptions,
  useNutritionSummaryReport,
  type NutritionAgeBand,
  type NutritionSummaryRow,
} from './nutrition-report.resource';

function goToPatientChart(patientUuid: string) {
  navigate({ to: `\${openmrsSpaBase}/patient/${patientUuid}/chart/visits` });
}

interface NutritionReportSharedProps {
  band: NutritionAgeBand;
  title: string;
  filenameBase: string;
  ageBandMin: number;
  ageBandMax: number | '';
}

export default function NutritionReportShared({ band, title, filenameBase, ageBandMin, ageBandMax }: NutritionReportSharedProps) {
  const { t } = useTranslation();

  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [appliedDates, setAppliedDates] = useState<{ startDate?: string; endDate?: string }>({});
  const [minAge, setMinAge] = useState<number | ''>(ageBandMin);
  const [maxAge, setMaxAge] = useState<number | ''>(ageBandMax);
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('');
  const [supplementFilter, setSupplementFilter] = useState('');
  const [minMuac, setMinMuac] = useState<number | ''>('');
  const [maxMuac, setMaxMuac] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, isLoading } = useNutritionSummaryReport(band, appliedDates.startDate, appliedDates.endDate);
  const { options: filterOptions } = useNutritionFilterOptions();
  const {
    locations: locationOptions,
    categories: categoryOptions,
    diagnoses: diagnosisOptions,
    supplementTypes: supplementOptions,
  } = filterOptions;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (minAge !== '' && (row.age == null || row.age < minAge)) {
        return false;
      }
      if (maxAge !== '' && (row.age == null || row.age > maxAge)) {
        return false;
      }
      if (locationFilter && row.location !== locationFilter) {
        return false;
      }
      if (categoryFilter && row.category !== categoryFilter) {
        return false;
      }
      if (diagnosisFilter && row.diagnosis !== diagnosisFilter) {
        return false;
      }
      if (supplementFilter && row.typeOfSupplement !== supplementFilter) {
        return false;
      }
      if (minMuac !== '' && (row.currentMuac == null || row.currentMuac < minMuac)) {
        return false;
      }
      if (maxMuac !== '' && (row.currentMuac == null || row.currentMuac > maxMuac)) {
        return false;
      }
      return true;
    });
  }, [rows, minAge, maxAge, locationFilter, categoryFilter, diagnosisFilter, supplementFilter, minMuac, maxMuac]);

  const searchedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return filteredRows;
    }
    return filteredRows.filter((row) =>
      [row.givenName, row.familyName, row.nationalId, row.phoneNumber, row.location]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [filteredRows, searchTerm]);

  const sortAccessors = useMemo(
    () => ({
      name: (row: NutritionSummaryRow) => `${row.familyName} ${row.givenName}`,
      category: (row: NutritionSummaryRow) => row.category ?? '',
      age: (row: NutritionSummaryRow) => row.age,
      location: (row: NutritionSummaryRow) => row.location ?? '',
      visitDate: (row: NutritionSummaryRow) => row.visitDate ?? '',
      visitCount: (row: NutritionSummaryRow) => row.visitCount,
      currentMuac: (row: NutritionSummaryRow) => row.currentMuac,
      lastMuac: (row: NutritionSummaryRow) => row.lastMuac,
      diagnosis: (row: NutritionSummaryRow) => row.diagnosis ?? '',
    }),
    [],
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows(searchedRows, sortAccessors, null);

  const kpiItems = useMemo(() => {
    const muacValues = filteredRows.map((row) => row.currentMuac).filter((value): value is number => value != null);
    const avgMuac =
      muacValues.length > 0 ? (muacValues.reduce((sum, v) => sum + v, 0) / muacValues.length).toFixed(1) : '—';
    return [
      { label: t('totalBeneficiaries', 'Total Beneficiaries'), value: filteredRows.length },
      { label: t('avgCurrentMuac', 'Avg Current MUAC (cm)'), value: avgMuac },
    ];
  }, [t, filteredRows]);

  const mainExportSheet = useMemo<ExportSheet>(
    () => ({
      name: title,
      headers: [
        t('givenName', 'Given Name'),
        t('familyName', 'Family Name'),
        t('category', 'Category'),
        t('age', 'Age'),
        t('location', 'Location'),
        t('visitDate', 'Visit Date'),
        t('numberOfVisits', 'Number of Visits'),
        t('currentMuac', 'Current MUAC'),
        t('lastMuac', 'Last MUAC'),
        t('diagnosis', 'Diagnosis'),
        t('typeOfSupplement', 'Type of Supplement'),
        t('supplementQuantity', 'Supplement Quantity'),
        t('nationalId', 'National ID'),
        t('phoneNumber', 'Phone Number'),
        t('project', 'Project'),
      ],
      rows: filteredRows.map((row) => [
        row.givenName,
        row.familyName,
        row.category ?? '',
        row.age ?? '',
        row.location ?? '',
        row.visitDate ?? '',
        row.visitCount,
        row.currentMuac ?? '',
        row.lastMuac ?? '',
        row.diagnosis ?? '',
        row.typeOfSupplement ?? '',
        row.supplementQuantity ?? '',
        row.nationalId ?? '',
        row.phoneNumber ?? '',
        row.project ?? '',
      ]),
    }),
    [t, title, filteredRows],
  );

  function applyFilter() {
    setAppliedDates({ startDate: startDateInput || undefined, endDate: endDateInput || undefined });
  }

  function resetFilters() {
    setMinAge(ageBandMin);
    setMaxAge(ageBandMax);
    setLocationFilter('');
    setCategoryFilter('');
    setDiagnosisFilter('');
    setSupplementFilter('');
    setMinMuac('');
    setMaxMuac('');
    setSearchTerm('');
  }

  return (
    <div>
      <BackToReportsLink />
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{title}</h2>

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
        </div>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField} style={{ minWidth: '8rem' }}>
            <NumberInput
              id="minAge"
              label={t('minAge', 'Min Age')}
              size="md"
              value={minAge}
              min={ageBandMin}
              max={ageBandMax === '' ? undefined : ageBandMax}
              allowEmpty
              onChange={(_e, { value }) => setMinAge(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '8rem' }}>
            <NumberInput
              id="maxAge"
              label={t('maxAge', 'Max Age')}
              size="md"
              value={maxAge}
              min={ageBandMin}
              max={ageBandMax === '' ? undefined : ageBandMax}
              allowEmpty
              onChange={(_e, { value }) => setMaxAge(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="locationFilter">{t('location', 'Location')}</label>
            <select id="locationFilter" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="">{t('all', 'All')}</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="categoryFilter">{t('category', 'Category')}</label>
            <select id="categoryFilter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">{t('all', 'All')}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="diagnosisFilter">{t('diagnosis', 'Diagnosis')}</label>
            <select id="diagnosisFilter" value={diagnosisFilter} onChange={(e) => setDiagnosisFilter(e.target.value)}>
              <option value="">{t('all', 'All')}</option>
              {diagnosisOptions.map((diagnosis) => (
                <option key={diagnosis} value={diagnosis}>
                  {diagnosis}
                </option>
              ))}
            </select>
          </div>
          <div className={pageStyles.filterField}>
            <label htmlFor="supplementFilter">{t('typeOfSupplement', 'Type of Supplement')}</label>
            <select
              id="supplementFilter"
              value={supplementFilter}
              onChange={(e) => setSupplementFilter(e.target.value)}
            >
              <option value="">{t('all', 'All')}</option>
              {supplementOptions.map((supplement) => (
                <option key={supplement} value={supplement}>
                  {supplement}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={pageStyles.filterTile}>
          <div className={pageStyles.filterField} style={{ minWidth: '8rem' }}>
            <NumberInput
              id="minMuac"
              label={t('minCurrentMuac', 'Min Current MUAC')}
              size="md"
              value={minMuac}
              allowEmpty
              onChange={(_e, { value }) => setMinMuac(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '8rem' }}>
            <NumberInput
              id="maxMuac"
              label={t('maxCurrentMuac', 'Max Current MUAC')}
              size="md"
              value={maxMuac}
              allowEmpty
              onChange={(_e, { value }) => setMaxMuac(value === '' ? '' : Number(value))}
            />
          </div>
          <div className={pageStyles.filterField} style={{ minWidth: '16rem' }}>
            <Search
              size="md"
              labelText={t('search', 'Search')}
              placeholder={t('searchNamesIdsPlaceholder', 'Search name, ID, phone, location...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <Button kind="tertiary" size="md" onClick={resetFilters}>
            {t('resetFilters', 'Reset Filters')}
          </Button>
        </div>

        <ExportButtons filenameBase={filenameBase} mainSheet={mainExportSheet} disabled={isLoading} />

        {isLoading && <InlineLoading description={t('loadingReport', 'Loading report...')} />}

        {!isLoading && (
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.dataTable}>
              <thead>
                <tr>
                  <SortableHeader
                    label={t('beneficiaryName', 'Beneficiary Name')}
                    sortKey="name"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('category', 'Category')}
                    sortKey="category"
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
                    label={t('location', 'Location')}
                    sortKey="location"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <SortableHeader
                    label={t('visitDate', 'Visit Date')}
                    sortKey="visitDate"
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
                    label={t('currentMuac', 'Current MUAC')}
                    sortKey="currentMuac"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('lastMuac', 'Last MUAC')}
                    sortKey="lastMuac"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label={t('diagnosis', 'Diagnosis')}
                    sortKey="diagnosis"
                    activeSortKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="left"
                  />
                  <th className="left">{t('typeOfSupplement', 'Type of Supplement')}</th>
                  <th>{t('supplementQuantity', 'Supplement Quantity')}</th>
                  <th className="left">{t('nationalId', 'National ID')}</th>
                  <th className="left">{t('phoneNumber', 'Phone Number')}</th>
                  <th className="left">{t('project', 'Project')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.patientId} className={pageStyles.clickableRow} onClick={() => goToPatientChart(row.patientUuid)}>
                    <td className="left">
                      {row.givenName} {row.familyName}
                    </td>
                    <td className="left">{row.category || '--'}</td>
                    <td>{row.age ?? '--'}</td>
                    <td className="left">{row.location || '--'}</td>
                    <td>{row.visitDate || '--'}</td>
                    <td>{row.visitCount}</td>
                    <td>{row.currentMuac ?? '--'}</td>
                    <td>{row.lastMuac ?? '--'}</td>
                    <td className="left">{row.diagnosis || '--'}</td>
                    <td className="left">{row.typeOfSupplement || '--'}</td>
                    <td>{row.supplementQuantity ?? '--'}</td>
                    <td className="left">{row.nationalId || '--'}</td>
                    <td className="left">{row.phoneNumber || '--'}</td>
                    <td className="left">{row.project || '--'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className={pageStyles.emptyState}>
                      {t('noPatientsForSelection', 'No patients found for this selection.')}
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
