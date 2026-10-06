import { type StockItemFilter } from '../stock-items/stock-items.resource';
import { ResourceRepresentation } from '../core/api/api';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';

export function useStockInventoryItems(v?: ResourceRepresentation) {
  const filter: StockItemFilter = {
    v: v || ResourceRepresentation.Default,
  };

  const { items, isLoading, error } = useFetchAllPages<StockItemDTO, StockItemFilter>(
    '/stockmanagement/stockitem',
    filter,
  );

  return {
    items,
    isLoading,
    error,
  };
}
