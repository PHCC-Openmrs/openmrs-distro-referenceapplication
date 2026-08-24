import React from 'react';
import { useTranslation } from 'react-i18next';
import NutritionReportShared from './nutrition-report-shared.component';

export default function ChildAbove5Report() {
  const { t } = useTranslation();
  return (
    <NutritionReportShared
      band="above5"
      title={t('childAbove5ReportTitle', 'Nutrition Report - Child Above 5')}
      filenameBase="nutrition-report-child-above-5"
      ageBandMin={5}
      ageBandMax=""
    />
  );
}
