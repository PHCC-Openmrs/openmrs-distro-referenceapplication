import React, { useState } from 'react';

import { Button, InlineLoading } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { type StockItemInventory } from '../../core/api/types/stockItem/StockItemInventory';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemCost } from '../../core/api/types/stockOperation/StockOperationItemCost';

import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { extractErrorMessagesFromResponse } from '../../constants';
import { ResourceRepresentation } from '../../core/api/api';
import { LocationStockItem } from '../../core/api/types/stockItem/StockItem';
import { OperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { type StockItemInventoryFilter } from '../../stock-items/stock-items.resource';
import {
  getStockItemInventory,
  getStockOperation,
  getStockOperationItemsCost,
  useStockOperationAndItems,
} from '../stock-operations.resource';
import { PrintGoodsReceivedNoteStockOperation } from '../stock-print-reports/GoodsReceivedNote';
import { PrintRequisitionStockOperation } from '../stock-print-reports/RequisitionDocument';
import { BuildStockOperationData } from '../stock-print-reports/StockOperationReport';

interface StockOperationCancelButtonProps {
  operation: StockOperationDTO;
}

const TELEPHONE_ATTRIBUTE_TYPE_UUID = '14d4f066-15f5-102d-96e4-000c29c2a5d7';

// The operation only carries the requester's name, so find their user by name and read the telephone number from
// their person attributes. Returns "Name, phone" (or just the name when no number is recorded).
const fetchRequesterContact = async (name?: string): Promise<string | undefined> => {
  if (!name) {
    return undefined;
  }
  try {
    const res = await openmrsFetch<{
      results: Array<{
        person?: {
          display?: string;
          attributes?: Array<{ value?: unknown; attributeType?: { uuid?: string; display?: string } }>;
        };
      }>;
    }>(
      `${restBaseUrl}/user?q=${encodeURIComponent(
        name,
      )}&v=custom:(person:(display,attributes:(value,attributeType:(uuid,display))))`,
    );
    const normalise = (v?: string) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const match = res.data?.results?.find((u) => normalise(u.person?.display) === normalise(name));
    const phone = match?.person?.attributes?.find(
      (a) =>
        a.attributeType?.uuid === TELEPHONE_ATTRIBUTE_TYPE_UUID || /phone|mobile/i.test(a.attributeType?.display ?? ''),
    )?.value;
    const phoneText = typeof phone === 'object' && phone !== null ? (phone as { display?: string }).display : phone;
    return [name, phoneText].filter(Boolean).join(', ');
  } catch (e) {
    console.info(e);
    return name;
  }
};

const StockOperationPrintButton: React.FC<StockOperationCancelButtonProps> = ({ operation: _operation }) => {
  const { t } = useTranslation();
  const { isLoading, items: operation, error } = useStockOperationAndItems(_operation.uuid);
  const [loading, setLoading] = useState(false);
  const onPrintStockOperation = async () => {
    setLoading(true);
    try {
      let parentOperation: StockOperationDTO | null | undefined;
      let itemsCost: StockOperationItemCost[] | null | undefined = null;
      let itemInventory: StockItemInventory[] | null | undefined = null;

      if (operation.requisitionStockOperationUuid) {
        // get related requisition stock operation
        const response = await getStockOperation(operation.requisitionStockOperationUuid);
        parentOperation = response.data;
        if (!parentOperation) {
          return;
        }
      }

      if (
        parentOperation ||
        parentOperation?.operationType === 'stockissue' ||
        parentOperation?.operationType === 'transferout'
      ) {
        const enableOperationPrintCosts = true;
        if (enableOperationPrintCosts) {
          const inventoryFilter: StockItemInventoryFilter = {};
          if (operation?.uuid) {
            inventoryFilter.stockOperationUuid = operation.uuid;
          }
          const res = await getStockOperationItemsCost(inventoryFilter);
          itemsCost = res.data?.results;
        }
      }
      // Balance on Hand mirrors the "Item details" / "Available at supplying store" column of the operation form:
      // for a requisition it is the supplying store ("Request stock from"), for every other operation the
      // operation's own location (its source).
      const requisition =
        operation?.operationType === OperationType.REQUISITION_OPERATION_TYPE ? operation : parentOperation;
      const isReceipt = operation?.operationType === OperationType.RECEIPT_OPERATION_TYPE;
      const supplyingStoreUuid =
        (requisition || isReceipt
          ? requisition?.destinationUuid ?? operation?.destinationUuid
          : operation?.sourceUuid) ??
        operation?.sourceUuid ??
        operation?.destinationUuid ??
        operation?.atLocationUuid;
      const dispensingUnitNames: Record<string, string> = {};
      if (supplyingStoreUuid) {
        const stockItemUuids = [
          ...new Set(
            (operation.stockOperationItems ?? _operation?.stockOperationItems ?? [])
              .map((i) => i.stockItemUuid)
              .filter((uuid): uuid is string => Boolean(uuid)),
          ),
        ];
        const results = await Promise.all(
          stockItemUuids.map(async (stockItemUuid) => {
            const [inventoryRes, stockItemRes] = await Promise.all([
              getStockItemInventory({
                stockItemUuid,
                partyUuid: supplyingStoreUuid,
                groupBy: LocationStockItem,
                v: ResourceRepresentation.Default,
              }),
              openmrsFetch(`${restBaseUrl}/stockmanagement/stockitem/${stockItemUuid}`),
            ]);
            if (stockItemRes?.data?.dispensingUnitName) {
              dispensingUnitNames[stockItemUuid] = stockItemRes.data.dispensingUnitName;
            }
            // Grouped rows come back with a null stockItemUuid, so tag them with the item they were requested for.
            return (inventoryRes.data?.results ?? []).map((row) => ({ ...row, stockItemUuid }));
          }),
        );
        itemInventory = results.flat();
      }
      const data = await BuildStockOperationData(
        operation,
        operation.stockOperationItems ?? _operation?.stockOperationItems ?? [],
        parentOperation,
        itemsCost,
        itemInventory,
        dispensingUnitNames,
      );
      if (data) {
        data.requestedContact = await fetchRequesterContact(data.requestedBy);
        if (operation?.operationType === OperationType.RECEIPT_OPERATION_TYPE) {
          await PrintGoodsReceivedNoteStockOperation(data, t);
        } else {
          await PrintRequisitionStockOperation(data, t);
        }
      } else {
        console.info(data);
      }
    } catch (e: any) {
      console.info(e);
      showSnackbar({
        kind: 'error',
        title: t('errorPrintingStockOperation', 'Error printing stock operation'),
        subtitle: extractErrorMessagesFromResponse(e).join(', '),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={onPrintStockOperation}
      kind="tertiary"
      disabled={isLoading || loading}
      renderIcon={(props) => <Printer size={16} {...props} />}
    >
      {loading || isLoading ? (
        <InlineLoading description={t('loadingPlaceholder', 'Loading...')} iconDescription={t('loading', 'Loading')} />
      ) : (
        t('print', 'Print')
      )}
    </Button>
  );
};

export default StockOperationPrintButton;
