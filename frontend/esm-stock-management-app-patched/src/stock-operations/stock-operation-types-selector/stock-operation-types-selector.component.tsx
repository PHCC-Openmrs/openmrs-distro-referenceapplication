import React, { useCallback, useEffect } from 'react';
import { ButtonSkeleton, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { OverflowMenuVertical } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession, userHasAccess } from '@openmrs/esm-framework';
import { OperationType, type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import useFilteredOperationTypesByRoles from '../stock-operations-forms/hooks/useFilteredOperationTypesByRoles';
import { TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE } from '../../constants';

const StockOperationTypesSelector = () => {
  const { t } = useTranslation();
  const { error, isLoading, operationTypes } = useFilteredOperationTypesByRoles();
  const session = useSession();
  // The location-scope's operationTypes list (userRoles.operationTypes, consumed above)
  // also doubles as what makes stock quantities visible at all for a given location, so a
  // view-only scope still carries at least one operation type. Without this check, anyone
  // with read access to stock would see a "Start New" button even though the backend's
  // saveStockOperation() ultimately rejects the submission for lacking this privilege.
  const canCreateStockOperations = userHasAccess(TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE, session?.user);

  const handleSelect = useCallback(
    (stockOperationType: StockOperationType) => {
      const isStockIssueOperation = stockOperationType.operationType === OperationType.STOCK_ISSUE_OPERATION_TYPE;

      launchStockoperationAddOrEditWorkSpace(t, stockOperationType, undefined);
    },
    [t],
  );

  useEffect(() => {
    if (error) {
      showSnackbar({
        kind: 'error',
        title: t('stockOperationTypesError', 'Error loading stock operation types'),
        subtitle: error?.message,
      });
    }
  }, [error, t]);

  if (isLoading) return <ButtonSkeleton />;

  if (error) return null;

  if (!canCreateStockOperations) return null;

  return operationTypes && operationTypes.length ? (
    <OverflowMenu
      renderIcon={() => (
        <>
          {t('startNew', 'Start New')}&nbsp;&nbsp;
          <OverflowMenuVertical size={16} />
        </>
      )}
      menuOffset={{ top: 0, left: -100 }}
      style={{
        backgroundColor: '#007d79',
        backgroundImage: 'none',
        color: '#fff',
        minHeight: '1rem',
        padding: '.95rem !important',
        width: '8rem',
        marginRight: '0.5rem',
        whiteSpace: 'nowrap',
      }}
    >
      {operationTypes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((operation) => (
          <OverflowMenuItem
            key={operation.uuid}
            itemText={operation.name}
            onClick={() => {
              handleSelect(operation);
            }}
          />
        ))}
    </OverflowMenu>
  ) : null;
};

export default StockOperationTypesSelector;
