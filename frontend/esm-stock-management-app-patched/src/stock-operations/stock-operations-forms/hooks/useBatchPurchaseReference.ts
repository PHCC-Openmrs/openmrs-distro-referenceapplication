import { useMemo } from 'react';
import { type ExternalReferenceParts, parseExternalReference } from '../../external-reference.utils';
import { useStockItemBatchNumbers } from './useStockItemBatchNumbers';

/**
 * The PO/PR/Fund codes a batch inherits from the Opening Stock (or Receipt) that brought it in.
 * Uses the same batch list request as the batch picker and the batch-number cell, so it adds no
 * request of its own. Empty strings when no batch is chosen or the batch has no origin codes.
 */
export function useBatchPurchaseReference(stockItemUuid?: string, stockBatchUuid?: string) {
  const { stockItemBatchNos, isLoading } = useStockItemBatchNumbers(stockItemUuid);
  const reference: ExternalReferenceParts = useMemo(
    () =>
      parseExternalReference(
        stockBatchUuid ? stockItemBatchNos?.find((batch) => batch.uuid === stockBatchUuid)?.originExternalReference : null,
      ),
    [stockItemBatchNos, stockBatchUuid],
  );
  return { reference, isLoading };
}
