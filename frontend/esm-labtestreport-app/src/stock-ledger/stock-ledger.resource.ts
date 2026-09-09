import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface StockLedgerRow {
  stockItemId: number;
  itemName: string;
  locationId: number;
  locationName: string | null;
  batchNo: string | null;
  // The real stock_batch identity. batchNo is free text a user types on Opening Stock / Receipt,
  // so two distinct batches can share the same batchNo - grouping must key off batchId, not batchNo.
  batchId: number;
  expirationDate: string | null;
  ledgerDate: string;
  // The day's Opening Balance: everything available at this location that day, i.e. the previous
  // day's closing balance plus that day's arrivals. Computed server-side as
  // remainingQty + outgoingQty, so actualQty - outgoingQty === remainingQty on every row.
  actualQty: number;
  // Bucketed by the sign of the transaction, not by operation type: outgoingQty covers a Transfer
  // Out's source leg, a Disposal and a dispense alike, and inflowQty covers every kind of arrival.
  // Only actualQty / outgoingQty / remainingQty are rendered as columns; inflowQty and carryInQty
  // are carried for densification and cross-checking.
  inflowQty: number;
  outgoingQty: number;
  remainingQty: number;
  // What this item/location/batch already held before startDate; 0 when the report is unbounded.
  carryInQty: number;
  unitName: string | null;
  // The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can also
  // be read as whole packs - see reports-shell/format-quantity. Both null when the item has no bulk
  // pack configured.
  bulkUnitName: string | null;
  bulkFactor: number | null;
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function useStockLedgerReport(
  startDate?: string,
  endDate?: string,
  locationUuid?: string,
  enabled: boolean = true,
) {
  const url = enabled
    ? `/module/labtestreport/api/stock-ledger.json${buildQuery({ startDate, endDate, locationUuid })}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockLedgerRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
