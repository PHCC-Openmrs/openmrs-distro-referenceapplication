import React from 'react';
import { useTranslation } from 'react-i18next';
import CmamSummaryReportView from './cmam-summary-report-view.component';

export default function CmamAbove5SummaryReport() {
  const { t } = useTranslation();
  return (
    <CmamSummaryReportView
      ageGroup="above5"
      pageTitle={t('cmamAbove5FollowUpReportTitle', 'CMAM Follow-up Summary Report (Above 5)')}
      countColumnLabel={t('numberOfPatients', 'Number of Patients')}
      exportFilenameBase="cmam-follow-up-report-above5"
    />
  );
}
