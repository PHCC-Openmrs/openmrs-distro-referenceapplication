import { InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceRepresentation } from '../../../core/api/api';
import { LocationStockItem } from '../../../core/api/types/stockItem/StockItem';
import { useStockItem, useStockItemInventory } from '../../../stock-items/stock-items.resource';
import styles from './stock-operation-items-form-step.scc.scss';

interface StockAvailabilityProps {
  stockItemUuid: string;
  // The party whose on-hand quantity to report - required rather than optional because the
  // stockiteminventory resource returns *every* party's rows when it isn't filtered, and this
  // cell totals the rows it gets back. Omitting it doesn't degrade to "unknown", it silently
  // reports the sum across every facility in the system (main store included) as if it were
  // available at this operation's location. Callers that don't know the party yet should render
  // a placeholder instead of this component.
  partyUuid: string;
}

const StockAvailability: React.FC<StockAvailabilityProps> = ({ stockItemUuid, partyUuid }) => {
  // Grouped by LocationStockItem, so the item's batches at this party collapse into a single
  // row and the figure shown is the location's whole on-hand. Summing batch-level rows instead
  // would cap the total at one page of batches (the batch-information hook used elsewhere asks
  // for 10), quietly under-reporting any item with more open batches than that.
  const { items, isLoading, error } = useStockItemInventory({
    v: ResourceRepresentation.Default,
    stockItemUuid: stockItemUuid,
    partyUuid: partyUuid,
    groupBy: LocationStockItem,
  });
  const { item, isLoading: isLoadingItem } = useStockItem(stockItemUuid);
  const { t } = useTranslation();

  const rows = useMemo(() => items?.results ?? [], [items]);

  const totalQuantity = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((total, row) => {
      return total + (Number(row.quantity) || 0);
    }, 0);
  }, [rows]);
  const commonUOM = useMemo(() => {
    if (!rows.length) return '';
    return rows[0]?.quantityUoM || '';
  }, [rows]);

  // Quantities are recorded in the packaging unit stock operations use (e.g. Box), not the
  // dispensing unit (e.g. Piece) - quantityFactor converts one to the other, so show both when
  // they differ and neither figure is mislabeled.
  const dispensingQuantity = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((total, row) => {
      return total + (Number(row.quantity) || 0) * (Number.parseFloat(row.quantityFactor) || 1);
    }, 0);
  }, [rows]);
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
