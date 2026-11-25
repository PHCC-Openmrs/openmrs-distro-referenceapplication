import { parseExternalReference } from '../external-reference.utils';
import { type StockItemInventory } from '../../core/api/types/stockItem/StockItemInventory';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemCost } from '../../core/api/types/stockOperation/StockOperationItemCost';
import { type StockOperationItemDTO } from '../../core/api/types/stockOperation/StockOperationItemDTO';
import { HEALTH_CENTER_NAME } from '../../constants';
import { OperationType } from '../../core/api/types/stockOperation/StockOperationType';

export interface StockOperationPrintData {
  operationNumber?: string;
  organizationName?: string;
  location?: string;
  operationDate?: Date;
  orderedBy?: string;
  responsiblePerson?: string;
  authorizedBy?: string;
  requestedBy?: string;
  requestedDate?: Date;
  requestedContact?: string;
  approvedBy?: string;
  approvedDate?: Date;
  items?: StockOperationItemData[];
  issueDate?: Date;
  receiptDate?: Date;
  receiverName?: string;
  issuerName?: string;
  documentTitle?: string;
  operationTypeName?: string;
  source?: string;
  destination?: string;
  deliverFrom?: string;
  deliverTo?: string;
  remarks?: string;
  projectFundCode?: string;
}

export interface StockOperationItemData {
  itemCode?: string;
  itemDescription?: string;
  batchNumber?: string;
  expiryDate?: Date;
  balanceOnHand?: number;
  balanceOnHandUoM?: string;
  balanceOnHandDispensing?: number;
  balanceOnHandDispensingUoM?: string;
  quantityRequired?: number;
  quantityRequiredUoM?: string;
  quantityIssued?: number;
  quantityIssuedUoM?: string;
  unitCost?: number;
  unitCostUoM?: string;
  totalCost?: number;
  purchasePrice?: number;
}

// Same "Box - 20" label the quantity unit dropdown shows, so the printed unit says how many units it holds.
export const formatPackagingUnit = (
  name: string | null | undefined,
  factor: number | string | null | undefined,
): string | undefined => {
  if (!name) {
    return undefined;
  }
  const size = factor === null || factor === undefined || factor === '' ? NaN : Number(factor);
  return Number.isFinite(size) ? `${name} - ${size}` : name;
};

export const BuildStockOperationData = async (
  currentOperation: StockOperationDTO,
  stockOperationItems: StockOperationItemDTO[],
  parentOperation?: StockOperationDTO,
  operationItemsCost?: StockOperationItemCost[] | null,
  inventory?: StockItemInventory[] | null,
  dispensingUnitNames?: Record<string, string> | null,
): Promise<StockOperationPrintData | null> => {
  const data: StockOperationPrintData = {};
  if (OperationType.REQUISITION_OPERATION_TYPE !== currentOperation.operationType) {
    data.authorizedBy = currentOperation?.dispatchedDate
      ? `${currentOperation.dispatchedByFamilyName ?? ''} ${currentOperation.dispatchedByGivenName ?? ''}`
      : currentOperation?.completedDate
      ? `${currentOperation.completedByFamilyName ?? ''} ${currentOperation.completedByGivenName ?? ''}`
      : '';
  }
  // Requester: whoever submitted the request (falls back to whoever started it). When printing an issue/transfer that
  // fulfils a requisition, the requisition's requester is used.
  const requestSource = parentOperation ?? currentOperation;
  const fullName = (given?: string | null, family?: string | null) => `${given ?? ''} ${family ?? ''}`.trim();
  data.requestedBy =
    fullName(requestSource?.submittedByGivenName, requestSource?.submittedByFamilyName) ||
    fullName(requestSource?.creatorGivenName, requestSource?.creatorFamilyName);
  data.requestedDate = requestSource?.submittedDate ?? requestSource?.dateCreated;
  // Approver: whoever dispatched/approved the operation, otherwise whoever completed it.
  if (currentOperation?.dispatchedDate) {
    data.approvedBy = fullName(currentOperation.dispatchedByGivenName, currentOperation.dispatchedByFamilyName);
    data.approvedDate = currentOperation.dispatchedDate;
  } else if (currentOperation?.completedDate) {
    data.approvedBy = fullName(currentOperation.completedByGivenName, currentOperation.completedByFamilyName);
    data.approvedDate = currentOperation.completedDate;
  }
  data.operationTypeName = currentOperation?.operationTypeName ?? undefined;
  data.remarks = currentOperation.remarks;
  data.operationNumber = currentOperation?.operationNumber;
  data.projectFundCode =
    parseExternalReference(currentOperation?.externalReference).projectFundCode ||
    parseExternalReference(parentOperation?.externalReference).projectFundCode ||
    undefined;
  data.operationDate = parentOperation?.operationDate ?? currentOperation?.operationDate;
  data.location = parentOperation?.atLocationName ?? currentOperation?.atLocationName;
  // Only a requisition has two locations: the requesting one (location) and the supplying store it asks for stock from.
  const requisitionOperation =
    currentOperation?.operationType === OperationType.REQUISITION_OPERATION_TYPE ? currentOperation : parentOperation;
  data.deliverFrom = requisitionOperation?.destinationName ?? undefined;
  if (currentOperation?.operationType === OperationType.TRANSFER_OUT_OPERATION_TYPE) {
    // A transfer moves stock between two locations: out of the source, to the destination.
    data.deliverFrom = currentOperation.sourceName ?? undefined;
    data.deliverTo = currentOperation.destinationName ?? undefined;
  }
  data.source = currentOperation?.sourceName;
  data.destination = currentOperation?.destinationName;
  data.responsiblePerson = data.orderedBy = parentOperation?.responsiblePersonFamilyName
    ? `${parentOperation.responsiblePersonFamilyName ?? ''} ${parentOperation?.responsiblePersonGivenName ?? ''}`
    : `${currentOperation.responsiblePersonFamilyName ?? ''} ${currentOperation.responsiblePersonGivenName ?? ''}`;
  data.organizationName = HEALTH_CENTER_NAME;
  data.documentTitle = `${currentOperation.operationTypeName} ${currentOperation?.operationNumber}${
    parentOperation ? ` of ${parentOperation.operationTypeName} ${parentOperation?.operationNumber}` : ''
  }`;
  data.items = stockOperationItems.map((p) => {
    const item: StockOperationItemData = {};
    item.itemCode = p?.acronym;
    item.itemDescription = p?.stockItemName;
    item.purchasePrice = p?.purchasePrice;
    item.batchNumber = p?.batchNo;
    item.expiryDate = p?.expiration;
    if (parentOperation) {
      item.quantityRequired = p?.quantityRequested;
      item.quantityRequiredUoM = formatPackagingUnit(
        p?.quantityRequestedPackagingUOMName,
        p?.quantityRequestedPackagingUOMFactor,
      );
      item.quantityIssued = p?.quantity;
      item.quantityIssuedUoM = formatPackagingUnit(p?.stockItemPackagingUOMName, p?.stockItemPackagingUOMFactor);
    } else if (OperationType.STOCK_ISSUE_OPERATION_TYPE === currentOperation.operationType) {
      item.quantityIssued = p?.quantity;
      item.quantityIssuedUoM = formatPackagingUnit(p?.stockItemPackagingUOMName, p?.stockItemPackagingUOMFactor);
    } else {
      item.quantityRequired = p?.quantity;
      item.quantityRequiredUoM = formatPackagingUnit(p?.stockItemPackagingUOMName, p?.stockItemPackagingUOMFactor);
    }
    if (operationItemsCost) {
      const operationItemCost = operationItemsCost.find((x) => x.uuid === p.uuid);
      if (operationItemCost) {
        item.unitCost = operationItemCost.unitCost;
        item.unitCostUoM = operationItemCost.unitCostUOMName;
        item.totalCost = operationItemCost.totalCost;
      }
    }
    if (inventory) {
      // Total across the item's batches at the supplying store (same figure the requisition form shows as
      // "Available at supplying store"), in the packaging unit plus the dispensing unit.
      const itemInventory = inventory.filter((x) => x.stockItemUuid === p.stockItemUuid);
      if (!itemInventory.length) {
        // Same as the form's "Out of Stock": nothing on hand.
        item.balanceOnHand = 0;
      } else {
        item.balanceOnHand = itemInventory.reduce((total, x) => total + (Number(x.quantity) || 0), 0);
        item.balanceOnHandUoM = itemInventory[0].quantityUoM;
        const dispensingUnit = p.stockItemUuid ? dispensingUnitNames?.[p.stockItemUuid] : undefined;
        if (dispensingUnit && dispensingUnit !== item.balanceOnHandUoM) {
          item.balanceOnHandDispensing = itemInventory.reduce(
            (total, x) => total + (Number(x.quantity) || 0) * (Number.parseFloat(x.quantityFactor) || 1),
            0,
          );
          item.balanceOnHandDispensingUoM = dispensingUnit;
        }
      }
    }
    return item;
  });
  return data;
};
