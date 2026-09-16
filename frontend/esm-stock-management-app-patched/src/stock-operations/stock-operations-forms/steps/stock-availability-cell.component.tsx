import { InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStockItemBatchInformationHook } from '../../../stock-items/add-stock-item/batch-information/batch-information.resource';
import { useStockItem } from '../../../stock-items/stock-items.resource';
import styles from './stock-operation-items-form-step.scc.scss';
const StockAvailability: React.FC<{ stockItemUuid: string }> = ({ stockItemUuid }) => {
  const { items, isLoading, error } = useStockItemBatchInformationHook({
    stockItemUuid: stockItemUuid,
    includeBatchNo: true,
  });
  const { item, isLoading: isLoadingItem } = useStockItem(stockItemUuid);
  const { t } = useTranslation();

  const totalQuantity = useMemo(() => {
    if (!items?.length) return 0;
    return items.reduce((total, batch) => {
      return total + (Number(batch.quantity) || 0);
    }, 0);
  }, [items]);
  const commonUOM = useMemo(() => {
    if (!items?.length) return '';
    return items[0]?.quantityUoM || '';
  }, [items]);

  // Batch quantities are recorded in the packaging unit stock operations use (e.g. Box), not the
  // dispensing unit (e.g. Piece) - quantityFactor converts one to the other, so show both when
  // they differ and neither figure is mislabeled.
  const dispensingQuantity = useMemo(() => {
    if (!items?.length) return 0;
    return items.reduce((total, batch) => {
      return total + (Number(batch.quantity) || 0) * (Number.parseFloat(batch.quantityFactor) || 1);
    }, 0);
  }, [items]);
  const dispensingUnitName = item?.dispensingUnitName ?? '';
  const showDispensingQuantity = Boolean(dispensingUnitName) && dispensingUnitName !== commonUOM;

  useEffect(() => {
    if (error) {
      showSnackbar({
        kind: 'error',
        title: t('stockAvailabilityError', 'Error loading stock availability'),
        subtitle: error?.message,
      });
    }
  }, [error, t]);

  if (isLoading || isLoadingItem) return <InlineLoading status="active" iconDescription="Loading" />;
  if (error) return <>--</>;

  return (
    <div className={styles.availability}>
      {totalQuantity > 0 ? (
        <span>
          Available: {totalQuantity.toLocaleString()} {commonUOM}
          {showDispensingQuantity ? ` (${dispensingQuantity.toLocaleString()} ${dispensingUnitName})` : ''}
        </span>
      ) : (
        <span className={styles.outOfStock}>Out of Stock</span>
      )}
    </div>
  );
};

export default StockAvailability;
