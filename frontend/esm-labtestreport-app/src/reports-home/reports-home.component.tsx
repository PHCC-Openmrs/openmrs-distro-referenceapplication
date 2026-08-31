import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClickableTile, Grid, Column, InlineLoading, Tag } from '@carbon/react';
import { ArrowRight, WarningAltFilled, CheckmarkFilled } from '@carbon/react/icons';
import { navigate, useSession } from '@openmrs/esm-framework';
import { useCmamSummaryReport } from '../cmam-summary/cmam-summary.resource';
import pageStyles from '../reports-shell/reports-page.scss';
import styles from './reports-home.scss';

interface ReportTile {
  key: string;
  title: string;
  description: string;
  route: string;
  alertCount?: number;
  alertLoading?: boolean;
}

interface ReportCategory {
  key: string;
  label: string;
  tiles: Array<ReportTile>;
}

/**
 * Groups every report into the same handful of categories a clinic manager would think in
 * (clinical/diagnostic activity, patient activity, nutrition, stock), mirroring how the
 * Stock Reports tab itself groups its own sub-reports - so growing the report count doesn't mean
 * growing an undifferentiated wall of tiles.
 */
export default function ReportsHome() {
  const { t } = useTranslation();
  const session = useSession();
  const isSuperUser = session?.user?.roles?.some(
    (role) => role.display === 'System Developer' || role.display === 'Application: Has Super User Privileges',
  );
  const hasProgrammaticReportsAccess =
    isSuperUser || session?.user?.privileges?.some((p) => p.display === 'App: reports.programmatic');
  const hasStockReportsAccess =
    isSuperUser || session?.user?.privileges?.some((p) => p.display === 'App: stockmanagement.dashboard');

  const { rows: cmamAlertRows, isLoading: cmamAlertLoading } = useCmamSummaryReport('under5');
  const cmamAlertCount = useMemo(
    () =>
      cmamAlertRows
        .filter((row) => row.dimension === 'alertStatus' && row.category !== 'OK')
        .reduce((sum, row) => sum + row.total, 0),
    [cmamAlertRows],
  );

  const { rows: cmamAbove5AlertRows, isLoading: cmamAbove5AlertLoading } = useCmamSummaryReport('above5');
  const cmamAbove5AlertCount = useMemo(
    () =>
      cmamAbove5AlertRows
        .filter((row) => row.dimension === 'alertStatus' && row.category !== 'OK')
        .reduce((sum, row) => sum + row.total, 0),
    [cmamAbove5AlertRows],
  );

  const categories: Array<ReportCategory> = [
    {
      key: 'clinical',
      label: t('clinicalReports', 'Clinical Reports'),
      tiles: [
        {
          key: 'lab-test-summary',
          title: t('labTestSummaryReportTitle', 'Lab Test Summary Report'),
          description: t(
            'labTestSummaryReportTileDesc',
            'Lab test orders by category, test, age group and gender, with drill-down to the patients behind each count.',
          ),
          route: 'lab-test-summary-report',
        },
        {
          key: 'disease-summary',
          title: t('diseaseSummaryReportTitle', 'Disease Surveillance Summary Report'),
          description: t(
            'diseaseSummaryReportTileDesc',
            'Diagnoses by category, age group and gender, with drill-down to the patients behind each count.',
          ),
          route: 'disease-summary-report',
        },
      ],
    },
    {
      key: 'patient-activity',
      label: t('patientActivityReports', 'Patient Activity Reports'),
      tiles: [
        {
          key: 'patient-encounter-summary',
          title: t('patientVisitSummaryReportTitle', 'Patient Visit Summary Report'),
          description: t(
            'patientVisitSummaryReportTileDesc',
            'Patients by number of visits and most recent visit date. Click a patient to open their chart.',
          ),
          route: 'patient-encounter-summary-report',
        },
        {
          key: 'referral-form-report',
          title: t('referralFormReportTitle', 'Referral Form Report'),
          description: t(
            'referralFormReportTileDesc',
            'Every Referral Form submission with the referral, clinical and signature details recorded on the form. Click a row to open that patient\'s chart.',
          ),
          route: 'referral-form-report',
        },
        {
          key: 'ncd-patient-card-report',
          title: t('ncdPatientCardReportTitle', 'NCD Patient Card Report'),
          description: t(
            'ncdPatientCardReportTileDesc',
            'Every NCD Patient Card submission with condition, status and follow-up details recorded on the form. Click a row to open that patient\'s chart.',
          ),
          route: 'ncd-patient-card-report',
        },
      ],
    },
    {
      key: 'nutrition',
      label: t('nutritionReports', 'Nutrition Reports'),
      tiles: [
        {
          key: 'cmam-follow-up',
          title: t('cmamFollowUpReportTitle', 'CMAM Follow-up Summary Report (Under 5)'),
          description: t(
            'cmamFollowUpReportTileDesc',
            'Children under 5 by Current Diagnosis, Child Last Status and Alert Status, with drill-down to the children behind each count.',
          ),
          route: 'cmam-follow-up-report',
          alertCount: cmamAlertCount,
          alertLoading: cmamAlertLoading,
        },
        {
          key: 'cmam-above5-follow-up',
          title: t('cmamAbove5FollowUpReportTitle', 'CMAM Follow-up Summary Report (Above 5)'),
          description: t(
            'cmamAbove5FollowUpReportTileDesc',
            'Patients 5 and older by Current Diagnosis, Child Last Status and Alert Status, with drill-down to the patients behind each count.',
          ),
          route: 'cmam-above5-follow-up-report',
          alertCount: cmamAbove5AlertCount,
          alertLoading: cmamAbove5AlertLoading,
        },
        {
          key: 'child-under-5',
          title: t('childUnder5ReportTitle', 'Nutrition Report - Child Under 5'),
          description: t(
            'childUnder5ReportTileDesc',
            'Beneficiaries currently under 5, with Current MUAC and Last MUAC and drill-down to each beneficiary.',
          ),
          route: 'child-under-5-report',
        },
        {
          key: 'child-above-5',
          title: t('childAbove5ReportTitle', 'Nutrition Report - Child Above 5'),
          description: t(
            'childAbove5ReportTileDesc',
            'Beneficiaries currently 5 or older, with Current MUAC and Last MUAC and drill-down to each beneficiary.',
          ),
          route: 'child-above-5-report',
        },
      ],
    },
    {
      key: 'stock',
      label: t('stockReports', 'Stock Reports'),
      tiles: [
        {
          key: 'stock-reports-home',
          title: t('stockReportsTitle', 'Stock Reports'),
          description: t(
            'stockReportsTileDesc',
            'Inventory ledger, consumption by location, and distribution reports for stock management.',
          ),
          route: 'stock-reports-home',
        },
      ],
    },
  ];

  const visibleCategories = categories.filter((category) =>
    category.key === 'stock' ? hasStockReportsAccess : hasProgrammaticReportsAccess,
  );

  return (
    <div>
      <div className={pageStyles.pageBody}>
        <h2 className={pageStyles.pageHeading}>{t('reports', 'Reports')}</h2>
        {visibleCategories.map((category) => (
          <div key={category.key} className={styles.categorySection}>
            <h3 className={styles.categoryLabel}>{category.label}</h3>
            <Grid className={styles.tileGrid}>
              {category.tiles.map((tile) => (
                <Column sm={4} md={4} lg={5} key={tile.key}>
                  <ClickableTile
                    className={styles.tile}
                    onClick={() => navigate({ to: `\${openmrsSpaBase}/${tile.route}` })}
                  >
                    <div className={styles.tileTitleRow}>
                      <div className={styles.tileTitle}>{tile.title}</div>
                      {tile.alertLoading && <InlineLoading />}
                      {!tile.alertLoading && tile.alertCount !== undefined && tile.alertCount > 0 && (
                        <Tag type="red" size="sm" renderIcon={WarningAltFilled} className={styles.tileBadge}>
                          {t('nNeedAttention', '{{count}} need attention', { count: tile.alertCount })}
                        </Tag>
                      )}
                      {!tile.alertLoading && tile.alertCount === 0 && (
                        <Tag type="green" size="sm" renderIcon={CheckmarkFilled} className={styles.tileBadge}>
                          {t('allClear', 'All clear')}
                        </Tag>
                      )}
                    </div>
                    <p className={styles.tileDescription}>{tile.description}</p>
                    <ArrowRight size={20} className={styles.tileIcon} />
                  </ClickableTile>
                </Column>
              ))}
            </Grid>
          </div>
        ))}
      </div>
    </div>
  );
}
