import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

// The inventory quantity is recorded in whatever packaging unit (e.g. Box) the stock
// operations used, not in the item's dispensing unit (e.g. Strip) - quantityUoM/quantityFactor
// carry the packaging unit's name and its conversion factor to the dispensing unit, so callers
// that need to *display* the quantity can also show the dispensing-unit equivalent.
export interface StockItemQuantityMeta {
  quantityUoM: string;
  quantityFactor: number;
}

// One row of GET stockmanagement/itemquantities: per item, the values that
// stockiteminventory?stockItemUuid=..&locationUuid=..&groupBy=StockItemOnly returns as its first result.
// Items with no stock at the location have no row.
export interface StockItemQuantity {
  stockItemUuid: string;
  quantity: number;
  quantityUoM?: string | null;
  quantityUoMUuid?: string | null;
  quantityFactor?: number | null;
}

export async function fetchItemQuantities(locationUuid: string): Promise<Array<StockItemQuantity>> {
  const url = `${restBaseUrl}/stockmanagement/itemquantities?locationUuid=${encodeURIComponent(locationUuid)}`;
  const { data } = await openmrsFetch<{ results: Array<StockItemQuantity> }>(url);
  return data?.results ?? [];
}

export function toQuantityMaps(rows: Array<StockItemQuantity>, stockItemUuids: Array<string>) {
  const rowByItem = new Map(rows.map((row) => [row.stockItemUuid, row]));
  const quantityByItem = new Map<string, number>();
  const quantityMetaByItem = new Map<string, StockItemQuantityMeta>();
  for (const stockItemUuid of stockItemUuids) {
    const result = rowByItem.get(stockItemUuid);
    quantityByItem.set(stockItemUuid, result?.quantity ?? 0);
    if (result?.quantityUoM) {
      quantityMetaByItem.set(stockItemUuid, {
        quantityUoM: result.quantityUoM,
        quantityFactor: Number(result.quantityFactor) || 1,
      });
    }
  }
  return { quantityByItem, quantityMetaByItem };
}

export async function fetchQuantitiesByItem(stockItemUuids: Array<string>, locationUuid: string) {
  return toQuantityMaps(await fetchItemQuantities(locationUuid), stockItemUuids);
}

export function useStockItemQuantities(stockItemUuids: Array<string>, locationUuid: string | undefined) {
  // One request for every item at the location. Keyed as a string starting with the stockiteminventory
  // REST path (rather than the itemquantities URL it fetches, or an array tuple) so that handleMutate's
  // prefix-based cache invalidation of `${restBaseUrl}/stockmanagement/stockiteminventory` - already
  // called after adding/editing items and after operations complete - actually reaches this cache.
  // handleMutate only matches string keys. The key leaves out the item list: the response covers every
  // item, so searching the items table does not refetch quantities.
  const key =
    locationUuid && stockItemUuids.length > 0
      ? `${restBaseUrl}/stockmanagement/stockiteminventory?itemQuantities=${locationUuid}`
      : null;
  const { data, error, isLoading } = useSWR(key, () => fetchItemQuantities(locationUuid as string));
  const { quantityByItem, quantityMetaByItem } = useMemo(
    () => toQuantityMaps(data ?? [], data ? stockItemUuids : []),
    [data, stockItemUuids],
  );
  return {
    quantityByItem,
    quantityMetaByItem,
    isLoading,
    error,
  };
}
