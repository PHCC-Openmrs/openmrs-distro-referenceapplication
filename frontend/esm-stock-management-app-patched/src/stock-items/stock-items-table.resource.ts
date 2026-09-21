import { useMemo, useState } from 'react';
import { type StockItemFilter } from './stock-items.resource';
import { ResourceRepresentation } from '../core/api/api';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { rankStockItemsByRelevance } from '../core/utils/stockItemSearchRelevance';
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

  // The server returns its (deliberately fuzzy) matches ordered by stock item id, so the item the
  // user typed can sit below unrelated hits. Re-order by how well each row matches the search text.
  const rankedItems = useMemo(() => rankStockItemsByRelevance(items, searchString), [items, searchString]);

  return {
    items: rankedItems,
    isLoading,
    error,
    isDrug,
    setDrug,
    setSearchString,
  };
}
