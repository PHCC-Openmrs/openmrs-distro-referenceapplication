import { type TFunction } from 'i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { OperationType, type StockOperationType } from '../core/api/types/stockOperation/StockOperationType';
import {
  getStockOperationUniqueId,
  launchStockoperationAddOrEditWorkSpace,
} from '../stock-operations/stock-operation.utils';

export interface ReorderItem {
  uuid: string;
  displayName: string;
  hasExpiration?: boolean;
  reorderLevelUoMUuid?: string | null;
}

/**
 * Opens a new Requisition operation - the actual "order more stock" workflow - with the
 * item the Reorder button was clicked for already added as a row on the Stock items step.
 * The quantity is left blank for the user to fill in (edit button on the row); the unit is
 * pre-selected from the item's reorder-level unit when it has one.
 */
export function launchReorderOperation(
  t: TFunction,
  requisitionOperationType: StockOperationType | undefined,
  item?: ReorderItem,
) {
  if (!requisitionOperationType) {
    showSnackbar({
      kind: 'error',
      isLowContrast: true,
      title: t('reorder', 'Reorder'),
      subtitle: t(
        'noRequisitionPermission',
        "You don't have permission to create a requisition. Contact an administrator to update your role scopes.",
      ),
    });
    return;
  }

  const initialItems = item
    ? [
        {
          uuid: `new-item-${getStockOperationUniqueId()}`,
          stockItemUuid: item.uuid,
          hasExpiration: item.hasExpiration ?? false,
          stockItemPackagingUOMUuid: item.reorderLevelUoMUuid ?? undefined,
        },
      ]
    : undefined;

  launchStockoperationAddOrEditWorkSpace(t, requisitionOperationType, undefined, undefined, initialItems);

  if (item) {
    showSnackbar({
      kind: 'info',
      isLowContrast: true,
      title: t('reorder', 'Reorder'),
      subtitle: t(
        'reorderItemAdded',
        '{{itemDisplayName}} has been added to this requisition. Enter the quantity on the Stock items step.',
        {
          itemDisplayName: item.displayName,
        },
      ),
    });
  }
}

export function findRequisitionOperationType(operationTypes: Array<StockOperationType> | undefined) {
  return operationTypes?.find((type) => type.operationType === OperationType.REQUISITION_OPERATION_TYPE);
}
