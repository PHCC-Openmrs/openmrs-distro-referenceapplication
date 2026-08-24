import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { StockLocationQtyRow, StockMovementDetailRow } from '../stock-consumption/stock-consumption.resource';

export type { StockLocationQtyRow, StockMovementDetailRow };

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

export function useStockWastageReport(startDate?: string, endDate?: string, locationUuid?: string, enabled: boolean = true) {
  const url = enabled
    ? `/module/labtestreport/api/stock-wastage.json${buildQuery({ startDate, endDate, locationUuid })}`
    : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockLocationQtyRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}

export function useStockWastageDrilldown(
  stockItemId?: number,
  locationId?: number,
  startDate?: string,
  endDate?: string,
) {
  const url =
    stockItemId != null && locationId != null
      ? `/module/labtestreport/api/stock-wastage-drilldown.json${buildQuery({ stockItemId, locationId, startDate, endDate })}`
      : null;
  const { data, error, isLoading } = useSWR<{ data: Array<StockMovementDetailRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
