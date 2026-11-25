import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@carbon/react';
import pageStyles from './reports-page.scss';
import type { PriceRange } from './purchase-price';

interface PriceRangeFilterProps {
  id: string;
  value: PriceRange;
  onChange: (value: PriceRange) => void;
}

/**
 * "Unit price from / to" boxes for the stock reports' filter tile. The range is per dispensing unit,
 * the figure the Unit Price column leads with - see reports-shell/purchase-price.
 */
export default function PriceRangeFilter({ id, value, onChange }: PriceRangeFilterProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className={pageStyles.filterField} style={{ maxWidth: '9rem' }}>
        <TextInput
          id={`${id}Min`}
          type="number"
          min={0}
          step="any"
          size="md"
          labelText={t('unitPriceFrom', 'Unit price from')}
          placeholder={t('anyPrice', 'Any')}
          value={value.min}
          onChange={(e) => onChange({ ...value, min: e.target.value })}
        />
      </div>
      <div className={pageStyles.filterField} style={{ maxWidth: '9rem' }}>
        <TextInput
          id={`${id}Max`}
          type="number"
          min={0}
          step="any"
          size="md"
          labelText={t('unitPriceTo', 'Unit price to')}
          placeholder={t('anyPrice', 'Any')}
          value={value.max}
          onChange={(e) => onChange({ ...value, max: e.target.value })}
        />
      </div>
    </>
  );
}
