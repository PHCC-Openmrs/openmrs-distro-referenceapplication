import { type StockOperationFilter } from './stock-operations.resource';
import { useFetchAllPages } from '../core/api/useFetchAllPages';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { formatDisplayDate } from '../core/utils/datetimeUtils';
import { parseExternalReference } from './external-reference.utils';
import { useMemo, useState } from 'react';
import { usePagination } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

// Every piece of text a user might type to find an operation: the columns shown in the table
// plus the item names/batches inside it, which only appear once the row is expanded.
function getSearchableText(operation: StockOperationDTO): string {
  const { purchaseOrderNo, purchaseRequestNo, projectFundCode } = parseExternalReference(operation.externalReference);
  return [
    operation.operationNumber,
    operation.operationTypeName,
    operation.status,
    operation.sourceName,
    operation.destinationName,
    operation.atLocationName,
    operation.responsiblePersonGivenName,
    operation.responsiblePersonFamilyName,
    operation.responsiblePersonOther,
    operation.creatorGivenName,
    operation.creatorFamilyName,
    operation.reasonName,
    operation.remarks,
    formatDisplayDate(operation.operationDate),
    purchaseOrderNo,
    purchaseRequestNo,
    projectFundCode,
    ...(operation.stockOperationItems ?? []).flatMap((item) => [
      item.commonName,
      item.stockItemName,
      item.acronym,
      item.batchNo,
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function useStockOperationPages(filter: StockOperationFilter, searchTerm = '') {
  // The server returns only its default page (50 rows) when no limit is sent, while the table
  // paginates client-side, so load every page up front - otherwise pages past the first 50 rows
  // repeat the same rows even though the total says there are more.
  const { items: allOperations, isLoading, error } = useFetchAllPages<StockOperationDTO, StockOperationFilter>(
    '/stockmanagement/stockoperation',
    filter,
  );

  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);

  // Search runs over the full result set, not just the visible page, so matches on later
  // pages are found and the pagination count reflects the matches.
  const searchedItems = useMemo(() => {
    const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      return allOperations;
    }
    return allOperations.filter((operation) => {
      const text = getSearchableText(operation);
      return terms.every((term) => text.includes(term));
    });
  }, [allOperations, searchTerm]);

  const { goTo, results: paginatedItems, currentPage } = usePagination(searchedItems, currentPageSize);

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
    totalItems: searchedItems?.length ?? 0,
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
