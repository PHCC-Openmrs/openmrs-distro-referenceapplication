import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectItem } from '@carbon/react';
import { type ItemType } from './row-filter';
import pageStyles from './reports-page.scss';

interface ItemTypeFilterProps {
  id?: string;
  value: ItemType;
  onChange: (itemType: ItemType) => void;
}

/** All / Pharmaceuticals / Non Pharmaceuticals dropdown shared by the stock reports. */
export default function ItemTypeFilter({ id = 'itemTypeFilter', value, onChange }: ItemTypeFilterProps) {
  const { t } = useTranslation();
  return (
    <div className={pageStyles.filterField}>
      <Select
        id={id}
        labelText={t('itemType', 'Item Type')}
        value={value}
        onChange={(e) => onChange(e.target.value as ItemType)}
      >
        <SelectItem value="" text={t('allItemTypes', 'All item types')} />
        <SelectItem value="pharma" text={t('pharmaceuticals', 'Pharmaceuticals')} />
        <SelectItem value="nonPharma" text={t('nonPharmaceuticals', 'Non Pharmaceuticals')} />
      </Select>
    </div>
  );
}
