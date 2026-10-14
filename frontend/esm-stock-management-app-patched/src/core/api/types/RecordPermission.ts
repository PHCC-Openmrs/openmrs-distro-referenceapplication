export interface RecordPermission {
  canView: boolean;
  canEdit: boolean;
  // A SUBMITTED operation that is still awaiting approval can be edited; saving sends it back to NEW
  canEditBeforeApproval?: boolean | undefined | null;
  canApprove: boolean | undefined | null;
  // Cancelling a SUBMITTED operation is its own privilege, separate from approve/reject/return
  canCancel?: boolean | undefined | null;
  canReceiveItems: boolean | undefined | null;
  canDisplayReceivedItems: boolean | undefined | null;
  isRequisitionAndCanIssueStock: boolean | undefined | null;
  canUpdateBatchInformation: boolean | undefined | null;
}
