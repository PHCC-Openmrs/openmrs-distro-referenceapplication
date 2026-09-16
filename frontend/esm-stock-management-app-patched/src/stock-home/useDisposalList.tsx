import { type StockOperationFilter } from '../stock-operations/stock-operations.resource';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { StockOperationStatusCompleted } from '../core/api/types/stockOperation/StockOperationStatus';

export function useDisposalList(filter: StockOperationFilter) {
  const { items, isLoading, error } = useFetchAllPages<StockOperationDTO, StockOperationFilter>(
    '/stockmanagement/stockoperation',
    filter,
  );

  // Only COMPLETED disposals have actually taken the stock out of the location - a disposal
  // still sitting at NEW/SUBMITTED (or one that was cancelled/rejected) hasn't moved anything,
  // so counting it here would overstate what was disposed.
  const receivedItems = items?.filter(
    (item) => item?.operationType === 'disposed' && item?.status === StockOperationStatusCompleted,
  );

  return {
    items: receivedItems,
    isLoading,
    error,
  };
}
