import React from 'react';
import { type ExternalReferenceParts } from '../../external-reference.utils';
import { useBatchPurchaseReference } from '../hooks/useBatchPurchaseReference';

type BatchPurchaseReferenceCellProps = {
  stockItemUuid: string;
  stockBatchUuid?: string;
  field: keyof ExternalReferenceParts;
};

// Read-only: on operations that draw from an existing batch, these codes come from the batch's
// Opening Stock and can't be changed here.
const BatchPurchaseReferenceCell: React.FC<BatchPurchaseReferenceCellProps> = ({
  stockItemUuid,
  stockBatchUuid,
  field,
}) => {
  const { reference } = useBatchPurchaseReference(stockItemUuid, stockBatchUuid);
  return <p>{reference[field] || '--'}</p>;
};

export default BatchPurchaseReferenceCell;
