import React from 'react';
import { useTranslation } from 'react-i18next';
import NutritionReportShared from './nutrition-report-shared.component';

export default function ChildUnder5Report() {
  const { t } = useTranslation();
  return (
    <NutritionReportShared
      band="under5"
      title={t('childUnder5ReportTitle', 'Nutrition Report - Child Under 5')}
      filenameBase="nutrition-report-child-under-5"
      ageBandMin={0}
      ageBandMax={4}
    />
  );
}
