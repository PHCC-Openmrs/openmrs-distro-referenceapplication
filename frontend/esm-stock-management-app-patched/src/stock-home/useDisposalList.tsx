import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';

export function useDisposalList(filter: StockOperationFilter) {
  const { items, isLoading, error } = useFetchAllPages<StockOperationDTO, StockOperationFilter>(
    '/stockmanagement/stockoperation',
    filter,
  );

  const receivedItems = items?.filter((item) => item?.operationType === 'disposed');

  return {
    items: receivedItems,
    isLoading,
    error,
  };
}
