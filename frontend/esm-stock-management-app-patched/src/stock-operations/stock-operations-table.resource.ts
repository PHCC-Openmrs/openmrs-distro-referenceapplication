import { type StockOperationFilter } from './stock-operations.resource';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { type PageableResult } from '../core/api/types/PageableResult';
import { toQueryParams } from '../core/api/api';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useDebounce } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

// Rows are requested from the server in blocks of this size, and only the block(s) the visible
// table page falls in are loaded - never the whole history, which grows with every dispense,
// adjustment and transfer and used to take one sequential request per 100 operations.
export const OPERATIONS_BLOCK_SIZE = 100;
// Shorter search text would match nearly everything; until then the unfiltered list is shown.
export const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

function useOperationsBlock(filter: StockOperationFilter, block: number | null) {
  // The stock management REST resources treat `startIndex` as a page NUMBER (offset =
  // startIndex * limit), not a row offset - see fetchAllPages.
  const url =
    block === null
      ? null
      : `${restBaseUrl}/stockmanagement/stockoperation${toQueryParams({
          ...filter,
          startIndex: block,
          limit: OPERATIONS_BLOCK_SIZE,
          totalCount: true,
        })}`;
  return useSWR<{ data: PageableResult<StockOperationDTO> }, Error>(url, openmrsFetch, { keepPreviousData: true });
}

export function useStockOperationPages(filter: StockOperationFilter, searchTerm = '') {
  // Searching runs on the server (`q`), over every operation, not only the loaded block.
  const debouncedSearch = useDebounce(searchTerm.trim(), SEARCH_DEBOUNCE_MS);
  const q = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : undefined;
  const serverFilter = useMemo(() => ({ ...filter, q }), [filter, q]);
  const filterKey = toQueryParams(serverFilter);

  const [currentPageSize, setPageSize] = useState(10);
  // The page is remembered together with the filter it was chosen under, so a new filter or search
  // starts again from page 1 without an extra render showing an out-of-range page.
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const currentPage = pageState.filterKey === filterKey ? pageState.page : 1;
  const goTo = useCallback((page: number) => setPageState({ filterKey, page }), [filterKey]);

  const firstRow = (currentPage - 1) * currentPageSize;
  const lastRow = firstRow + currentPageSize - 1;
  const firstBlock = Math.floor(firstRow / OPERATIONS_BLOCK_SIZE);
  const lastBlock = Math.floor(lastRow / OPERATIONS_BLOCK_SIZE);

  const first = useOperationsBlock(serverFilter, firstBlock);
  const totalItems = first.data?.data?.totalCount ?? first.data?.data?.results?.length ?? 0;
  // Page sizes of 30/40 can straddle two blocks; fetch the next one only when it has rows.
  const needsSecondBlock = lastBlock !== firstBlock && lastBlock * OPERATIONS_BLOCK_SIZE < totalItems;
  const second = useOperationsBlock(serverFilter, needsSecondBlock ? lastBlock : null);

  const paginatedItems = useMemo(() => {
    const loaded = [
      ...(first.data?.data?.results ?? []),
      ...(needsSecondBlock ? second.data?.data?.results ?? [] : []),
    ];
    const offset = firstRow - firstBlock * OPERATIONS_BLOCK_SIZE;
    return loaded.slice(offset, offset + currentPageSize);
  }, [first.data, second.data, needsSecondBlock, firstRow, firstBlock, currentPageSize]);

  const isLoading = first.isLoading || (needsSecondBlock && second.isLoading);
  // Only the very first load has nothing to show; later loads keep the previous rows on screen.
  const isInitialLoading = first.isLoading && !first.data;
  const error = first.error ?? second.error;

  const pageSizes = [10, 20, 30, 40, 50];

  const { t } = useTranslation();

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t('type', 'Type'),
        key: 'operationTypeName',
      },
      {
        id: 1,
        header: t('number', 'Number'),
        key: 'operationNumber',
      },
      {
        id: 2,
        header: t('stockOperationItems', 'Items'),
        key: 'stockOperationItems',
      },
      {
        id: 3,
        header: t('status', 'Status'),
        key: 'status',
      },
      {
        id: 4,
        header: t('location', 'Location'),
        key: 'location',
      },
      {
        id: 5,
        header: t('responsiblePerson', 'Responsible Person'),
        key: 'responsiblePerson',
      },
      {
        id: 6,
        header: t('date', 'Date'),
        key: 'operationDate',
      },
      {
        id: 7,
        header: t('purchaseOrderNo', 'Purchase Order No'),
        key: 'purchaseOrderNo',
      },
      {
        id: 8,
        header: t('purchaseRequestNo', 'Purchase Request No'),
        key: 'purchaseRequestNo',
      },
      {
        id: 9,
        header: t('projectFundCode', 'Project Fund Code'),
        key: 'projectFundCode',
      },
      {
        id: 10,
        key: 'details',
        header: '',
      },
      { key: 'actions', header: '' },
    ],
    [t],
  );

  return {
    items: paginatedItems,
    totalItems,
    currentPage,
    currentPageSize,
    paginatedItems,
    goTo,
    pageSizes,
    isLoading,
    isInitialLoading,
    error,
    setPageSize,
    tableHeaders,
  };
}
