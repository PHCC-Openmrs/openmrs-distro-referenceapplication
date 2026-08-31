import { type StockOperationFilter, useStockOperations } from './stock-operations.resource';
import { useMemo, useState } from 'react';
import { usePagination } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

export function useStockOperationPages(filter: StockOperationFilter) {
  const { items, isLoading, error } = useStockOperations(filter);

  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);

  const { goTo, results: paginatedItems, currentPage } = usePagination(items.results, currentPageSize);

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
    totalItems: items?.totalCount,
    currentPage,
    currentPageSize,
    paginatedItems,
    goTo,
    pageSizes,
    isLoading,
    error,
    setPageSize,
    tableHeaders,
  };
}
