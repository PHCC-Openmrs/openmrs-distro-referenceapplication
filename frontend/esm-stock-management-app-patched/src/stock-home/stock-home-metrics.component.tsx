import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading } from '@carbon/react';
import { ErrorState, showModal } from '@openmrs/esm-framework';
import { useStockDashboardSummary } from './stock-home-dashboard-summary.resource';
import {
  computeExpiringStockHistory,
  computeDisposedStockHistory,
  daysUntilExpiry,
  isExpiringWithinWindow,
} from './stock-home-metric-history.utils';
import MetricsCard from '../core/components/card/metrics-card-component';
import styles from './stock-home.scss';

// The disposal reasons are whatever answers the configured stockAdjustmentReasonUUID concept
// carries, so match on lower-cased fragments of their display names rather than on exact names.
// Reference data ships "Medication expired", "Medication spillage" and "Miscellaneous"; the card
// only has room for two sub-counts, so miscellaneous disposals show in the headline total only.
const EXPIRED_REASONS = ['expir'];
const SPILLAGE_REASONS = ['spill'];

function matchesDisposalReason(reasonName: string | null | undefined, fragments: Array<string>) {
  const normalizedReason = reasonName?.toLowerCase() ?? '';
  return normalizedReason !== '' && fragments.some((fragment) => normalizedReason.includes(fragment));
}

const StockManagementMetrics: React.FC = () => {
  const { t } = useTranslation();
  const {
    outOfStockItems,
    understockedItems,
    expiringBatches,
    disposals,
    outOfStockTrend,
    outOfStockSparkline,
    isLoading,
    error,
  } = useStockDashboardSummary();

  const currentDate = new Date();

  // Headline: everything expiring within 180 days, including batches already past expiry. The
  // server sends the location's batches with stock left, soonest expiry first (batches with no
  // expiration date last), so the most urgent rows lead the Expiring stock modal.
  const filteredData = expiringBatches.filter((item) => isExpiringWithinWindow(item, currentDate));

  // "In 6 months" sub-count: the ones that haven't expired yet.
  const sixMonthsExpiryStocks = filteredData.filter((item) => daysUntilExpiry(item.expiration, currentDate) >= 0);

  // One disposal operation can dispose of several stock items, and both the card's modal and
  // the "disposed stock" idea itself are per stock item - counting operations made a single
  // disposal of 2 items read as "1" on the card while the modal listed 2 rows. Flatten to line
  // items, carrying down the operation-level reason/date the per-item rows don't hold.
  const disposedStockItems = React.useMemo(
    () =>
      disposals.flatMap((operation) =>
        (operation?.stockOperationItems ?? []).map((stockItem) => ({
          ...stockItem,
          reasonName: operation?.reasonName,
          sourceName: operation?.sourceName,
          operationDate: operation?.operationDate,
        })),
      ),
    [disposals],
  );

  const expiringStockHistory = React.useMemo(() => computeExpiringStockHistory(expiringBatches), [expiringBatches]);
  const disposedStockHistory = React.useMemo(
    () => computeDisposedStockHistory(disposedStockItems),
    [disposedStockItems],
  );

  if (error) {
    // openmrsFetch rejections carry the backend's actual message under responseBody.error.message;
    // error.message alone is frequently undefined (e.g. on a 403 for a role without privilege to
    // list stock items), which otherwise renders as the literal text "Error undefined".
    const errorMessage =
      (error as any)?.responseBody?.error?.message ??
      error?.message ??
      t('unknownErrorStockMetric', 'An unknown error occurred while fetching stock metrics.');
    return (
      <ErrorState
        headerTitle={t('errorStockMetric', 'Error fetching stock metrics')}
        error={{ message: errorMessage }}
      />
    );
  }

  // Until the counts arrive, show that they are loading rather than a row of zeros.
  if (isLoading) {
    return (
      <div className={styles.cardContainer}>
        <InlineLoading description={t('loading', 'Loading')} />
      </div>
    );
  }

  const expiredItems = disposedStockItems.filter((item) => matchesDisposalReason(item.reasonName, EXPIRED_REASONS));
  const spillageItems = disposedStockItems.filter((item) => matchesDisposalReason(item.reasonName, SPILLAGE_REASONS));

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
      disposedStock: disposals,
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
          expired: expiredItems,
          spillage: spillageItems,
        }}
        headerLabel={t('disposedStock', 'Disposed stock')}
        label={t('disposedStock', 'Disposed stock')}
        value={disposedStockItems.length}
        onClick={launchDisposedStockModal}
        trend={disposedStockHistory.trend}
        sparklineValues={disposedStockHistory.sparkline}
      />
    </div>
  );
};
export default StockManagementMetrics;
