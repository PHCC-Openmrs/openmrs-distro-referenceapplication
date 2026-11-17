import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useSession } from '@openmrs/esm-framework';

/** A stock item with the quantity the location holds, in the unit named by quantityUoM. */
export interface DashboardItemLevel {
  uuid: string;
  displayName: string;
  quantity: number;
  quantityUoM?: string | null;
  reorderLevel?: number | null;
  reorderLevelUoMUuid?: string | null;
  hasExpiration: boolean;
}

export interface DashboardExpiringBatch {
  stockItemUuid: string;
  displayName: string;
  drugName?: string | null;
  dispensingUnitName?: string | null;
  stockBatchUuid: string;
  batchNo?: string | null;
  expiration?: string | null;
  quantity: number;
  quantityUoM?: string | null;
}

export interface DashboardDisposalItem {
  stockItemName?: string | null;
  stockItemPackagingUOMName?: string | null;
  quantity?: number | null;
}

export interface DashboardDisposal {
  uuid: string;
  reasonName?: string | null;
  sourceName?: string | null;
  operationDate?: string | null;
  stockOperationItems: Array<DashboardDisposalItem>;
}

export interface StockDashboardSummary {
  outOfStockItems: Array<DashboardItemLevel>;
  understockedItems: Array<DashboardItemLevel>;
  /** Oldest first; daysAgo 0 is today. */
  outOfStockHistory: Array<{ daysAgo: number; outOfStockCount: number }>;
  /** Soonest expiry first; batches without an expiry date last. */
  expiringBatches: Array<DashboardExpiringBatch>;
  /** Completed disposals at the location. */
  disposals: Array<DashboardDisposal>;
}

/**
 * Everything the Overview page shows for the session location, in one request. The server
 * counts it (see StockDashboardController in the stockmanagement module), so the page no
 * longer loads every stock item, every batch and one inventory request per item.
 *
 * All the Overview cards call this; SWR shares the one request between them.
 */
export function useStockDashboardSummary() {
  const { sessionLocation } = useSession();
  const url = sessionLocation?.uuid
    ? `${restBaseUrl}/stockmanagement/dashboardsummary?locationUuid=${sessionLocation.uuid}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: StockDashboardSummary }, Error>(url, openmrsFetch);
  const summary = data?.data;

  const history = summary?.outOfStockHistory ?? [];
  const latest = history.find((point) => point.daysAgo === 0);
  const weekAgo = history.find((point) => point.daysAgo === 7);

  return {
    summary,
    outOfStockItems: summary?.outOfStockItems ?? [],
    understockedItems: summary?.understockedItems ?? [],
    expiringBatches: summary?.expiringBatches ?? [],
    disposals: summary?.disposals ?? [],
    outOfStockTrend: latest && weekAgo ? latest.outOfStockCount - weekAgo.outOfStockCount : null,
    outOfStockSparkline: history.map((point) => point.outOfStockCount),
    isLoading,
    error,
  };
}
