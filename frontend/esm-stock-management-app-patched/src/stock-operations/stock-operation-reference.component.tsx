import { InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import { launchStockoperationAddOrEditWorkSpace } from './stock-operation.utils';
import { fetchStockOperationAndItems } from './stock-operations.resource';

interface StockOperationReferenceProps {
  operationUuid: string;
  operationNumber: string;
}

const StockOperationReference = ({ operationNumber, operationUuid }: StockOperationReferenceProps) => {
  const { t } = useTranslation();
  const { types, isLoading: istypesLoading, error: typesError } = useStockOperationTypes();
  // Fetched when the reference is clicked, not by every transaction row on render.
  const [isStockOperationloading, setIsStockOperationLoading] = useState(false);

  const handleEdit = useCallback(async () => {
    if (isStockOperationloading || !operationUuid) {
      return;
    }
    setIsStockOperationLoading(true);
    let stockOperation;
    try {
      stockOperation = await fetchStockOperationAndItems(operationUuid);
    } catch (stockOperationError) {
      showSnackbar({
        title: t('errorLoadingStockOperation', 'Error loading stock operation'),
        subtitle: stockOperationError?.message,
        kind: 'error',
      });
      return;
    } finally {
      setIsStockOperationLoading(false);
    }
    const operationType = types.results?.find((op) => op?.uuid === stockOperation?.operationTypeUuid);
    if (!operationType) {
      return;
    }
    launchStockoperationAddOrEditWorkSpace(
      t,
      operationType,
      stockOperation,
      stockOperation?.requisitionStockOperationUuid,
    );
  }, [isStockOperationloading, operationUuid, t, types.results]);

  useEffect(() => {
    if (typesError) {
      showSnackbar({
        title: t('errorLoadingStockOperationTypes', 'Error loading stock operation types'),
        subtitle: typesError?.message,
        kind: 'error',
      });
    }
  }, [typesError, t]);

  if (istypesLoading || isStockOperationloading) {
    return <InlineLoading description={t('loading', 'Loading')} />;
  }

  return (
    <a onClick={handleEdit} style={{ cursor: 'pointer' }}>
      {operationNumber}
    </a>
  );
};

export default StockOperationReference;
