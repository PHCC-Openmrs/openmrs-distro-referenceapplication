import React from 'react';
import { useTranslation } from 'react-i18next';
import CmamSummaryReportView from './cmam-summary-report-view.component';

export default function CmamSummaryReport() {
  const { t } = useTranslation();
  return (
    <CmamSummaryReportView
      ageGroup="under5"
      pageTitle={t('cmamFollowUpReportTitle', 'CMAM Follow-up Summary Report (Under 5)')}
      countColumnLabel={t('numberOfChildren', 'Number of Children')}
      exportFilenameBase="cmam-follow-up-report-under5"
    />
  );
}
