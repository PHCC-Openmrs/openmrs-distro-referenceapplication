import React, { useCallback } from 'react';

import { Button } from '@carbon/react';
import { showModal } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { TrashCan } from '@carbon/react/icons';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';

interface StockOperationReverseButtonProps {
  operation: StockOperationDTO;
}

/** Administrators only: deletes a completed operation by reversing the stock it moved. */
const StockOperationReverseButton: React.FC<StockOperationReverseButtonProps> = ({ operation }) => {
  const { t } = useTranslation();
  const launchReverseModal = useCallback(() => {
    const dispose = showModal('stock-operations-modal', {
      title: 'Delete',
      operation: operation,
      requireReason: true,
      closeModal: () => dispose(),
    });
  }, [operation]);

  return (
    <Button onClick={launchReverseModal} kind="danger--ghost" renderIcon={(props) => <TrashCan size={16} {...props} />}>
      {t('deleteAction', 'Delete')}
    </Button>
  );
};

export default StockOperationReverseButton;
