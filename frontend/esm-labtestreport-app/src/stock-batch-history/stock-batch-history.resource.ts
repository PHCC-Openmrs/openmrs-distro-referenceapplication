import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

/**
 * What a movement was from the holding location's point of view, as
 * queries/stock_batch_history.sql classifies it. A two-legged operation (Transfer Out, Stock Issue,
 * Return) shows up once at each end, as the sending code at its source and the receiving code at
 * its destination.
 */
export type BatchActivity =
  | 'OPENING_STOCK'
  | 'RECEIVED'
  | 'TRANSFERRED_IN'
  | 'ISSUE_RECEIVED'
  | 'RETURN_RECEIVED'
  | 'TRANSFERRED_OUT'
  | 'ISSUED'
  | 'DISPENSED'
  | 'RETURNED'
  | 'DISPOSED'
  | 'ADJUSTED'
  | 'STOCK_TAKE';

export interface StockBatchHistoryRow {
  transactionId: number;
  operationDate: string;
  operationNumber: string | null;
  operationUuid: string;
  // Typed loosely too, so an operation type added to the stock module later still renders (under
  // its raw code) instead of breaking the page.
  activity: BatchActivity | string;
  stockItemId: number;
  itemName: string;
  stockBatchId: number;
  batchNo: string;
  // Null when the batch was received without an expiration date.
  expirationDate: string | null;
  locationId: number;
  locationUuid: string | null;
  locationName: string | null;
  // The location or vendor on the other side of a transfer, issue, return or receipt.
  counterpartName: string | null;
  // Set only on a dispense.
  patientName: string | null;
  // Signed: positive is stock arriving at this location, negative is stock leaving it.
  quantity: number;
  reasonName: string | null;
  recordedBy: string | null;
  unitName: string | null;
  // The item's bulk/procurement pack and how many dispensing units it holds - see
  // reports-shell/format-quantity. Both null when the item has no bulk pack configured.
  bulkUnitName: string | null;
  bulkFactor: number | null;
}

/** Fetches nothing until an item is chosen - the endpoint returns no rows without one anyway. */
export function useStockBatchHistoryReport(stockItemId?: number, stockBatchId?: number) {
  const params = new URLSearchParams();
  if (stockItemId) {
    params.set('stockItemId', String(stockItemId));
  }
  if (stockBatchId) {
    params.set('stockBatchId', String(stockBatchId));
  }
  const url = stockItemId ? `/module/labtestreport/api/stock-batch-history.json?${params.toString()}` : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockBatchHistoryRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
