import React, { useCallback, useEffect, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Edit } from '@carbon/react/icons';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import { fetchStockOperationAndItems } from '../stock-operations.resource';
import useFilteredOperationTypesByRoles from '../stock-operations-forms/hooks/useFilteredOperationTypesByRoles';
import styles from './edit-stock-operation-button.scss';

interface EditStockOperationActionMenuProps {
  stockOperation: StockOperationDTO;
  showIcon?: boolean;
  showprops?: boolean;
}
const EditStockOperationActionMenu: React.FC<EditStockOperationActionMenuProps> = ({
  stockOperation: _stockOperation,
  showIcon = true,
  showprops = true,
}) => {
  const { t } = useTranslation();

  const {
    error: operationTypesError,
    isLoading: isOperationTypesLoading,
    operationTypes,
  } = useFilteredOperationTypesByRoles();

  // The row already carries the operation's number and type. The workspace needs the full operation
  // (items with their packaging units, permissions, the requisition a stock issue fulfils), so it is
  // fetched when the user opens it rather than by every row of the list on render.
  const [isStockOperationLoading, setIsStockOperationLoading] = useState(false);

  const showLoadError = useCallback(
    (message?: string) =>
      showSnackbar({
        kind: 'error',
        title: t('stockOperationLoadError', 'Error loading stock operation'),
        subtitle: message || '',
      }),
    [t],
  );

  const handleLaunchWorkspace = useCallback(async () => {
    if (isStockOperationLoading || !_stockOperation?.uuid) {
      return;
    }
    setIsStockOperationLoading(true);
    let fetchedStockOperation: StockOperationDTO | undefined;
    try {
      fetchedStockOperation = await fetchStockOperationAndItems(_stockOperation.uuid);
    } catch (error) {
      showLoadError(error?.message);
      return;
    } finally {
      setIsStockOperationLoading(false);
    }
    const activeOperationType = operationTypes?.find((op) => op?.uuid === fetchedStockOperation?.operationTypeUuid);
    launchStockoperationAddOrEditWorkSpace(
      t,
      activeOperationType,
      fetchedStockOperation,
      fetchedStockOperation?.requisitionStockOperationUuid,
    );
  }, [isStockOperationLoading, _stockOperation?.uuid, operationTypes, t, showLoadError]);

  useEffect(() => {
    if (operationTypesError) {
      showLoadError(operationTypesError?.message);
    }
  }, [operationTypesError, showLoadError]);

  if (isOperationTypesLoading || isStockOperationLoading) {
    return <InlineLoading status="active" iconDescription="Loading" />;
  }

  if (operationTypesError) {
    return <>--</>;
  }

  return (
    <Button
      className={styles.editStockButton}
      kind="ghost"
      size="sm"
      onClick={handleLaunchWorkspace}
      renderIcon={showIcon ? () => <Edit size={16} /> : undefined}
    >
      {showprops && <span className={styles.operationNumberText}>{_stockOperation?.operationNumber}</span>}
    </Button>
  );
};

export default EditStockOperationActionMenu;
