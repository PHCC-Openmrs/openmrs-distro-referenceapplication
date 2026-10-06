import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

/** What the reason concept says an adjustment was for - see the backend's StockAdjustmentRow. */
export type AdjustmentPurpose = 'CONSUMPTION' | 'CORRECTION';

export interface StockAdjustmentRow {
  operationDate: string;
  operationNumber: string | null;
  locationId: number;
  locationName: string | null;
  stockItemId: number;
  itemName: string;
  isDrug: boolean | null;
  batchNo: string | null;
  expirationDate: string | null;
  // Signed: negative for a decrease, positive for an increase. Adjustments go both ways and which
  // way this one went is the substance of the row, so the sign is not normalised away.
  quantity: number;
  unitName: string | null;
  // The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can also
  // be read as whole packs - see reports-shell/format-quantity. Both null when the item has no bulk
  // pack configured.
  bulkUnitName: string | null;
  bulkFactor: number | null;
  reasonUuid: string | null;
  reasonName: string | null;
  remarks: string | null;
  responsiblePerson: string | null;
  purpose: AdjustmentPurpose;
  // The chosen reason disagrees with the item's own drug/non-drug identity - a drug recorded as
  // consumption, or a commodity recorded as a correction. Always false while no consumption reasons
  // are configured on the server, since nothing can be judged against an empty list.
  mismatched: boolean;
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

export function useStockAdjustmentsReport(startDate?: string, endDate?: string, locationUuid?: string) {
  const url = `/module/labtestreport/api/stock-adjustments.json${buildQuery({ startDate, endDate, locationUuid })}`;
  const { data, error, isLoading } = useSWR<{ data: Array<StockAdjustmentRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
