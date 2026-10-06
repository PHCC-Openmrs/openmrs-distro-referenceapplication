import { ResourceRepresentation } from '../core/api/api';
import { type StockBatchFilter } from '../stock-items/stock-items.resource';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockBatchDTO } from '../core/api/types/stockItem/StockBatchDTO';

export function useStockInventory() {
  const filter: StockBatchFilter = {
    v: ResourceRepresentation.Default,
    includeStockItemName: 'true',
  };

  const { items, isLoading, error } = useFetchAllPages<StockBatchDTO, StockBatchFilter>(
    '/stockmanagement/stockbatch',
    filter,
  );

  return {
    items,
    isLoading,
    error,
  };
}
