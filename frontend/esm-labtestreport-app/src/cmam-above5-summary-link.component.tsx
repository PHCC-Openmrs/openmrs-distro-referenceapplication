import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClickableTile, Layer } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';

export default function CmamAbove5SummaryLink() {
  const { t } = useTranslation();
  return (
    <Layer>
      <ClickableTile href={`${window.getOpenmrsSpaBase().slice(0, -1)}/cmam-above5-follow-up-report`}>
        <div>
          <div className="heading">{t('cmamAbove5FollowUpReportTitle', 'CMAM Follow-up Summary Report (Above 5)')}</div>
          <div className="content">
            {t(
              'cmamAbove5FollowUpReportShortDesc',
              'Patients 5 and older by Current Diagnosis, Child Last Status and Alert Status, with drill-down',
            )}
          </div>
        </div>
        <div className="iconWrapper">
          <ArrowRight size={16} />
        </div>
      </ClickableTile>
    </Layer>
  );
}
