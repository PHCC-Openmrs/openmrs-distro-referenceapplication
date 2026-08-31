import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, showModal, useSession } from '@openmrs/esm-framework';
import { ResourceRepresentation } from '../core/api/api';
import { useDisposalList } from './useDisposalList';
import { useStockInventory } from './stock-home-inventory-expiry.resource';
import { useStockInventoryItems } from './stock-home-inventory-items.resource';
import { useStockBatchQuantities } from './stock-home-batch-quantities.resource';
import { useStockLevelHistory } from './stock-home-level-history.resource';
import { computeExpiringStockHistory, computeDisposedStockHistory } from './stock-home-metric-history.utils';
import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import useStockList from './useStockList';
import MetricsCard from '../core/components/card/metrics-card-component';
import styles from './stock-home.scss';

const StockManagementMetrics: React.FC = (filter: StockOperationFilter) => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { outOfStockItems, understockedItems, error } = useStockList();
  const { items: expiryItems } = useStockInventory();
  const { items: stockItems } = useStockInventoryItems();
  const expiryItemUuids = React.useMemo(
    () => Array.from(new Set(expiryItems.map((batch) => batch.stockItemUuid))),
    [expiryItems],
  );
  const { quantityByBatch } = useStockBatchQuantities(expiryItemUuids, sessionLocation?.uuid);

  const currentDate = new Date();

  let mergedArray = expiryItems.map((batch) => {
    const matchingItem = stockItems?.find((item) => batch?.stockItemUuid === item.uuid);
    const batchQuantity = quantityByBatch.get(batch.uuid);
    return { ...batch, ...matchingItem, quantity: batchQuantity?.quantity ?? 0 };
  });

  // quantityByBatch is now scoped to sessionLocation, so a batch this location doesn't actually
  // hold any of shouldn't count as this location's "expiring stock".
  mergedArray = mergedArray.filter((item) => item.hasExpiration && item.quantity > 0);

  const filteredData = mergedArray.filter((item) => {
    // Stock items commonly have no configured notice period; falling back to 0 would only
    // flag items that are already overdue, hiding ones expiring soon (e.g. in 3 days). Default
    // to the same 180-day window the card itself uses (see sixMonthsExpiryStocks below).
    const expiryNotice = item.expiryNotice ?? 180;
    const expirationDate = new Date(item.expiration);
    const differenceInDays = Math.ceil((expirationDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return differenceInDays <= expiryNotice || differenceInDays < 0;
  });

  const sixMonthsExpiryStocks = filteredData.filter((stock) => stock.hasExpiration && stock.expiryNotice <= 180);

  const { items } = useDisposalList({
    v: ResourceRepresentation.Full,
    totalCount: true,
    locationUuid: sessionLocation?.uuid,
  });

  const { outOfStockTrend, outOfStockSparkline } = useStockLevelHistory(sessionLocation?.uuid, stockItems ?? []);
  const expiringStockHistory = React.useMemo(() => computeExpiringStockHistory(mergedArray), [mergedArray]);
  const disposedStockHistory = React.useMemo(() => computeDisposedStockHistory(items ?? []), [items]);

  if (error) {
    // openmrsFetch rejections carry the backend's actual message under responseBody.error.message;
    // error.message alone is frequently undefined (e.g. on a 403 for a role without privilege to
    // list stock items), which otherwise renders as the literal text "Error undefined".
    const errorMessage =
      (error as any)?.responseBody?.error?.message ??
      error?.message ??
      t('unknownErrorStockMetric', 'An unknown error occurred while fetching stock metrics.');
    return (
      <ErrorState headerTitle={t('errorStockMetric', 'Error fetching stock metrics')} error={{ message: errorMessage }} />
    );
  }

  const filteredItems =
    items && items.filter((item) => item.reasonName === 'Drug not available due to expired medication');
  const poorQualityItems = items && items.filter((item) => item.reasonName === 'Poor Quality');

  const launchOutOfStockModal = () => {
    const dispose = showModal('out-of-stock-modal', {
      closeModal: () => dispose(),
      outOfStockItems,
      understockedItems,
    });
  };

  const launchExpiringStockModal = () => {
    const dispose = showModal('expired-stock-modal', {
      closeModal: () => dispose(),
      expiredStock: filteredData,
    });
  };

  const launchDisposedStockModal = () => {
    const dispose = showModal('disposed-stock-modal', {
      closeModal: () => dispose(),
      disposedStock: items,
    });
  };

  return (
    <div className={styles.cardContainer}>
      <MetricsCard
        count={{
          expiry6months: sixMonthsExpiryStocks,
        }}
        headerLabel={t('expiringStock', 'Expiring stock')}
        label={t('expiringStock', 'Expiring stock')}
        value={filteredData?.length || 0}
        onClick={launchExpiringStockModal}
        trend={expiringStockHistory.trend}
        sparklineValues={expiringStockHistory.sparkline}
      />
      <MetricsCard
        label={t('outOfStock', 'Out of stock')}
        headerLabel={t('outOfStock', 'Out of stock')}
        outOfStockCount={{
          itemsBelowMin: understockedItems,
        }}
        value={outOfStockItems?.length ?? 0}
        onClick={launchOutOfStockModal}
        trend={outOfStockTrend}
        sparklineValues={outOfStockSparkline}
      />
      <MetricsCard
        disposedCount={{
          expired: filteredItems,
          poorQuality: poorQualityItems,
        }}
        headerLabel={t('disposedStock', 'Disposed stock')}
        label={t('disposedStock', 'Disposed stock')}
        value={items?.length || 0}
        onClick={launchDisposedStockModal}
        trend={disposedStockHistory.trend}
        sparklineValues={disposedStockHistory.sparkline}
      />
    </div>
  );
};
export default StockManagementMetrics;
