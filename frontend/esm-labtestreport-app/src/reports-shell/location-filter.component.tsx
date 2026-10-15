import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectItem } from '@carbon/react';
import { useLocations } from '@openmrs/esm-framework';
import pageStyles from './reports-page.scss';

const LOCATION_TAG = 'Login Location';

interface LocationFilterProps {
  id: string;
  /** The selected location's uuid, or '' for all locations. */
  value: string;
  onChange: (locationUuid: string) => void;
}

/**
 * Location dropdown for reports that filter by `locationUuid` on the server, listing the same
 * login locations the other reports' location filters do.
 */
export default function LocationFilter({ id, value, onChange }: LocationFilterProps) {
  const { t } = useTranslation();
  const locations = useLocations(LOCATION_TAG);

  return (
    <div className={pageStyles.filterField}>
      <Select id={id} labelText={t('location', 'Location')} value={value} onChange={(e) => onChange(e.target.value)}>
        <SelectItem value="" text={t('allLocations', 'All locations')} />
        {locations?.map((location) => (
          <React.Fragment key={location.uuid}>
            <SelectItem value={location.uuid} text={location.display} />
          </React.Fragment>
        ))}
      </Select>
    </div>
  );
}
