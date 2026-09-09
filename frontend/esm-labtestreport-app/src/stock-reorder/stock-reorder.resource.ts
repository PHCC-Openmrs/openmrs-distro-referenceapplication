import { openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface StockReorderRow {
  stockItemId: number;
  itemName: string;
  locationId: number;
  locationName: string | null;
  ruleName: string;
  reorderLevel: number;
  // Usable stock only - an expired batch is not dispensable, so it is not what the reorder level
  // should be judged against. expiredQty is shown alongside to explain a row flagged while physical
  // stock is still on the shelf.
  onHandQty: number;
  expiredQty: number;
  unitName: string | null;
  // The item's bulk/procurement pack and how many dispensing units it holds, so a quantity can also
  // be read as whole packs - see reports-shell/format-quantity. Both null when the item has no bulk
  // pack configured.
  bulkUnitName: string | null;
  bulkFactor: number | null;
}

export function useStockReorderReport(locationUuid?: string) {
  const url = `/module/labtestreport/api/stock-reorder.json${locationUuid ? `?locationUuid=${locationUuid}` : ''}`;
  const { data, error, isLoading } = useSWR<{ data: Array<StockReorderRow> }, Error>(url, openmrsFetch);
  return { rows: data?.data ?? [], error, isLoading };
}
