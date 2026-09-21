import { useEffect, useMemo, useState } from 'react';
import { type StockItemFilter, useStockItems as useStockItemsData } from '../../../stock-items/stock-items.resource';
import { type UserFilterCriteria } from '../../../stock-lookups/stock-lookups.resource';
import { ResourceRepresentation } from '../../../core/api/api';
import { rankStockItemsByRelevance } from '../../../core/utils/stockItemSearchRelevance';

/**
 * How many rows to ask the server for. The server matches fuzzily and returns the matches ordered
 * by stock item id rather than by relevance, so the item the user typed is often not among the
 * first few - fetch a wide enough window that it is in there to be re-ranked.
 */
const DEFAULT_SEARCH_LIMIT = 50;

export function useFilterableStockItems(filter?: StockItemFilter) {
  const [conceptFilter, setConceptFilter] = useState<UserFilterCriteria>(
    filter || {
      v: ResourceRepresentation.Default,
      limit: DEFAULT_SEARCH_LIMIT,
      startIndex: 0,
    },
  );

  const {
    items: { results: stockItemsList },
    isLoading,
  } = useStockItemsData(conceptFilter);

  const [searchString, setSearchString] = useState(null);

  // Drug filter type
  const [limit, setLimit] = useState(filter?.limit || DEFAULT_SEARCH_LIMIT);
  const [representation, setRepresentation] = useState(filter?.v || ResourceRepresentation.Default);

  useEffect(() => {
    setConceptFilter({
      startIndex: 0,
      v: representation,
      limit: limit,
      q: searchString,
    });
  }, [searchString, limit, representation]);

  const rankedStockItemsList = useMemo(
    () => rankStockItemsByRelevance(stockItemsList, searchString),
    [stockItemsList, searchString],
  );

  return {
    stockItemsList: rankedStockItemsList,
    setLimit,
    setRepresentation,
    setSearchString,
    isLoading,
  };
}
