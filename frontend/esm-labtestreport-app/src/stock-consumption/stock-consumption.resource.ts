import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface StockLocationQtyRow {
  stockItemId: number;
  itemName: string;
  locationId: number;
  locationName: string | null;
  quantity: number;
  unitName: string | null;
  /** Only populated for the Distribution report - null for Consumption and Wastage. */
  sourceLocationName: string | null;
  /** Current on-hand quantity at the row's location, as of now (not the moved quantity above). */
  remainingQty: number;
}

/**
 * How much of a summary row's total quantity came from one batch/vendor - e.g. "100 boxes from
 * batch A / Vendor X, 50 from batch B / Vendor Y" for a single item+location summary row.
 */
export interface StockMovementDetailRow {
  batchNo: string | null;
  expirationDate: string | null;
  vendorName: string | null;
  quantity: number;
  unitName: string | null;
  purchaseOrderNo: string | null;
  purchaseRequestNo: string | null;
  projectFundCode: string | null;
  /** Only populated for the Wastage report - undefined for Consumption and Distribution. */
  reasonName?: string | null;
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

export function useStockConsumptionReport(
  startDate?: string,
  endDate?: string,
  locationUuid?: string,
  enabled: boolean = true,
) {
  const url = enabled
    ? `/module/labtestreport/api/stock-consumption.json${buildQuery({ startDate, endDate, locationUuid })}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockLocationQtyRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}

export function useStockConsumptionDrilldown(
  stockItemId?: number,
  locationId?: number,
  startDate?: string,
  endDate?: string,
) {
  const url =
    stockItemId != null && locationId != null
      ? `/module/labtestreport/api/stock-consumption-drilldown.json${buildQuery({ stockItemId, locationId, startDate, endDate })}`
      : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockMovementDetailRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
