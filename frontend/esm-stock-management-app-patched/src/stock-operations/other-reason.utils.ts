import { OperationType } from '../core/api/types/stockOperation/StockOperationType';

// The reason concept's "Miscellaneous" answer is presented to users as "Other" on Adjustment and
// Disposal, and choosing it asks for a free-text reason. The backend has no column for a reason
// text (a stock operation's reason is always a concept), so the typed text is packed into the one
// free-text field it does have for this (remarks) behind a short prefix, and split back out
// wherever the operation is shown or edited.
const OTHER_REASON_CONCEPT_NAME = 'miscellaneous';
const OTHER_REASON_PREFIX = 'Reason: ';

// Column length of remarks on the backend.
export const REMARKS_MAX_LENGTH = 255;

export function operationTypeSupportsOtherReason(operationType?: string | null): boolean {
  return (
    operationType === OperationType.ADJUSTMENT_OPERATION_TYPE || operationType === OperationType.DISPOSED_OPERATION_TYPE
  );
}

export function isOtherReasonName(reasonName?: string | null): boolean {
  return reasonName?.trim().toLowerCase() === OTHER_REASON_CONCEPT_NAME;
}

/** The label to show for a reason: the "Miscellaneous" concept is shown as `otherLabel`. */
export function getReasonDisplayName(reasonName: string | null | undefined, otherLabel: string): string {
  return isOtherReasonName(reasonName) ? otherLabel : reasonName ?? '';
}

/**
 * The reason to show for a saved operation: the typed text when an Adjustment or Disposal has the
 * "Other" reason, "Other" for one saved without text, and the reason's own name otherwise.
 */
export function getOperationReasonDisplay(
  operation: { operationType?: string | null; reasonName?: string | null; remarks?: string | null },
  otherLabel: string,
): string {
  if (!operationTypeSupportsOtherReason(operation.operationType) || !isOtherReasonName(operation.reasonName)) {
    return operation.reasonName ?? '';
  }
  return parseRemarksWithOtherReason(operation.remarks).otherReason || otherLabel;
}

export function buildRemarksWithOtherReason(otherReason?: string | null, remarks?: string | null): string {
  const reason = (otherReason ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim();
  const rest = (remarks ?? '').trim();
  if (!reason) {
    return remarks ?? '';
  }
  return `${OTHER_REASON_PREFIX}${reason}${rest ? `\n${rest}` : ''}`;
}

export function parseRemarksWithOtherReason(remarks?: string | null): { otherReason: string; remarks: string } {
  if (!remarks?.startsWith(OTHER_REASON_PREFIX)) {
    return { otherReason: '', remarks: remarks ?? '' };
  }
  const withoutPrefix = remarks.slice(OTHER_REASON_PREFIX.length);
  const lineEnd = withoutPrefix.indexOf('\n');
  if (lineEnd === -1) {
    return { otherReason: withoutPrefix.trim(), remarks: '' };
  }
  return {
    otherReason: withoutPrefix.slice(0, lineEnd).trim(),
    remarks: withoutPrefix.slice(lineEnd + 1),
  };
}
