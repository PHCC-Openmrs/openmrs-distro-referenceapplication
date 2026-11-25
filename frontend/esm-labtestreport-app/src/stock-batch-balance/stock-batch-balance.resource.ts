import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { BatchPriceFields } from '../reports-shell/purchase-price';

// batchUnitPrice / itemUnitPrice: purchase price per dispensing unit - see reports-shell/purchase-price.
export interface StockBatchBalanceRow extends BatchPriceFields {
  stockItemId: number;
  itemName: string;
  locationId: number;
  locationName: string | null;
  stockBatchId: number;
  batchNo: string;
  // Null when the batch was received without an expiration date.
  expirationDate: string | null;
  quantity: number;
  unitName: string | null;
  // The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can also
  // be read as whole packs - see reports-shell/format-quantity. Both null when the item has no bulk
  // pack configured.
  bulkUnitName: string | null;
  bulkFactor: number | null;
  // True for a pharmaceutical (stock item linked to a drug), false for other commodities.
  isDrug: boolean | null;
}

export function useStockBatchBalanceReport(locationUuid?: string) {
  const query = locationUuid ? `?locationUuid=${encodeURIComponent(locationUuid)}` : '';
  const url = `/module/labtestreport/api/stock-batch-balance.json${query}`;
  const { data, error, isLoading } = useSWR<{ data: Array<StockBatchBalanceRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
