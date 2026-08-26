import { useState } from 'react';
import { type StockItemFilter } from './stock-items.resource';
import { ResourceRepresentation } from '../core/api/api';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';

export function useStockItemsPages(v?: ResourceRepresentation) {
  const [searchString, setSearchString] = useState(null);

  // Drug filter type
  const [isDrug, setDrug] = useState('');

  const filter: StockItemFilter = {
    v: v || ResourceRepresentation.Default,
    q: searchString,
    isDrug,
  };

  const { items, isLoading, error } = useFetchAllPages<StockItemDTO, StockItemFilter>(
    '/stockmanagement/stockitem',
    filter,
  );

  return {
    items,
    isLoading,
    error,
    isDrug,
    setDrug,
    setSearchString,
  };
}
