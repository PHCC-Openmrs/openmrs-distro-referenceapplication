import React, { useCallback, useId, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Edit, TrashCan } from '@carbon/react/icons';
import {
  Button,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import {
  operationFromString,
  type StockOperationType,
  StockOperationTypeIsReceipt,
  StockOperationTypeIsRequistion,
} from '../../../core/api/types/stockOperation/StockOperationType';
import { getStockOperationUniqueId } from '../../stock-operation.utils';
import { type BaseStockOperationItemFormData, type StockOperationItemDtoSchema } from '../../validation-schema';
import useOperationTypePermisions from '../hooks/useOperationTypePermisions';
import StockItemSearch from '../input-components/stock-item-search.component';
import QuantityUomCell from './quantity-uom-cell.component';
import StockAvailability from './stock-availability-cell.component';
import StockOperationItemBatchNoCell from './stock-operation-item-batch-no-cell.component';
import StockOperationItemCell from './stock-operation-item-cell.component';
import StockoperationItemExpiryCell from './stock-operation-item-expiry-cell.component';
import { type CustomTableHeader } from '../../../core/components/table/types';
import styles from './stock-operation-items-form-step.scc.scss';

type StockOperationItemsFormStepProps = {
  stockOperation?: StockOperationDTO;
  stockOperationType: StockOperationType;
  onNext?: () => void;
  onPrevious?: () => void;
  onLaunchItemsForm?: (stockOperationItem?: BaseStockOperationItemFormData) => void;
};
const StockOperationItemsFormStep: React.FC<StockOperationItemsFormStepProps> = ({
  stockOperationType,
  stockOperation,
  onNext,
  onPrevious,
  onLaunchItemsForm,
}) => {
  const { t } = useTranslation();
  const operationTypePermision = useOperationTypePermisions(stockOperationType);
  const uniqueId = useId();

  const form = useFormContext<StockOperationItemDtoSchema>();
  const observableOperationItems = form.watch('stockOperationItems');

  // The party whose on-hand quantity the "Item Details" column should report. Watched rather
  // than read once, so editing the location on step 1 refreshes the figures here.
  //
  // sourceUuid for almost every type: it's the operation's only location when the type has no
  // destination (Opening Stock, Stock Take, Adjustment, Disposal), and the side stock is drawn
  // from when it does (Transfer Out, Stock Issue, Return) - either way it holds the stock the
  // operation acts on. Receipt and Requisition are the exceptions: their source is an upstream
  // party we hold nothing at, and the quantity worth showing is what the receiving location
  // already has, so they use destinationUuid.
  const sourceUuid = form.watch('sourceUuid');
  const destinationUuid = form.watch('destinationUuid');
  const availabilityPartyUuid = useMemo(() => {
    const operationType = operationFromString(stockOperationType.operationType);
    return StockOperationTypeIsReceipt(operationType) || StockOperationTypeIsRequistion(operationType)
      ? destinationUuid
      : sourceUuid;
  }, [stockOperationType, sourceUuid, destinationUuid]);

  const handleRemoveItem = useCallback(
    (index: number) => {
      const items = (form.getValues('stockOperationItems') ?? []) as BaseStockOperationItemFormData[];
      form.setValue(
        'stockOperationItems',
        items.filter((_, i) => i !== index) as [BaseStockOperationItemFormData, ...BaseStockOperationItemFormData[]],
        { shouldDirty: true },
      );
    },
    [form],
  );
  const headers = useMemo(() => {
    return [
      {
        key: 'item',
        header: t('item', 'Item'),
        styles: { width: '40% !important' },
      },
      {
        key: 'itemDetails',
        header: t('itemDetails', 'Item Details'),
        styles: { width: '20% !important' },
      },
      ...(operationTypePermision.requiresBatchUuid || operationTypePermision.requiresActualBatchInfo
        ? [
            {
              key: 'batch',
              header: t('batchNo', 'Batch number'),
              styles: { width: '15% !important' },
            },
          ]
        : []),
      ...(operationTypePermision.requiresActualBatchInfo
        ? [
            {
              key: 'expiry',
              header: t('expiry', 'Expiry'),
            },
          ]
        : []),
      ...(operationTypePermision.requiresBatchUuid
        ? [
            {
              key: 'expiry',
              header: t('expiry', 'Expiry'),
            },
          ]
        : []),

      {
        key: 'quantity',
        header: t('quantity', 'Quantity'),
      },
      {
        key: 'quantityuom',
        header: t('quantityUom', 'Quantity unit of measurement'),
      },
      ...(operationTypePermision.canCaptureQuantityPrice
        ? [
            {
              key: 'purchasePrice',
              header: t('purchasePrice', 'Purchase Price'),
            },
          ]
        : []),
      { key: 'actions', header: t('actions', 'Actions') },
    ];
  }, [operationTypePermision, t]);

  const tableRows = useMemo(() => {
    return observableOperationItems?.map((item, index) => {
      const {
        batchNo,
        expiration,
        quantity,
        purchasePrice,
        uuid,
        stockItemUuid,
        stockItemPackagingUOMUuid,
        stockBatchUuid,
      } = item;

      return {
        id: uuid || `${uniqueId}-${index}`,
        item: stockItemUuid ? <StockOperationItemCell stockItemUuid={stockItemUuid} /> : '--',
        // Rendered only once the operation's location is known - StockAvailability without a
        // party would total every facility's stock instead of this location's.
        itemDetails:
          stockItemUuid && availabilityPartyUuid ? (
            <StockAvailability stockItemUuid={stockItemUuid} partyUuid={availabilityPartyUuid} />
          ) : (
            '--'
          ),
        batch: (
          <StockOperationItemBatchNoCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            batchNo={batchNo}
            stockItemUuid={stockItemUuid}
          />
        ),
        expiry: (
          <StockoperationItemExpiryCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            expiration={expiration}
            stockItemUuid={stockItemUuid}
          />
        ),
        quantity: quantity?.toLocaleString(),
        quantityuom: stockItemPackagingUOMUuid ? (
          <QuantityUomCell stockItemPackagingUOMUuid={stockItemPackagingUOMUuid} stockItemUuid={stockItemUuid} />
        ) : (
          '--'
        ),
        purchasePrice: purchasePrice,
        actions: (
          <>
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={t('edit', 'Edit')}
              kind="ghost"
              renderIcon={Edit}
              onClick={() => {
                onLaunchItemsForm?.(item);
              }}
            />
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={t('delete', 'Delete')}
              kind="ghost"
              renderIcon={TrashCan}
              onClick={() => {
                handleRemoveItem(index);
              }}
            />
          </>
        ),
      };
    });
  }, [
    availabilityPartyUuid,
    handleRemoveItem,
    observableOperationItems,
    onLaunchItemsForm,
    stockOperationType,
    t,
    uniqueId,
  ]);

  const handleNext = async () => {
    const valid = await form.trigger(['stockOperationItems']);
    if (valid) {
      onNext();
    } else {
      showSnackbar({
        kind: 'error',
        title: 'Validation error',
        subtitle:
          observableOperationItems && observableOperationItems.length > 0
            ? 'You must update batch infomation for items'
            : 'You must add atleast one item',
      });
    }
  };

  const headerTitle = t('stockOperationItems', 'Stock operation items');

  return (
    <div style={{ margin: '10px' }}>
      <div className={styles.tableContainer}>
        <div className={styles.heading}>
          <h4>{headerTitle}</h4>
        </div>
        <StockItemSearch
          onSelectedItem={(stockItem) =>
            onLaunchItemsForm({
              uuid: `new-item-${getStockOperationUniqueId()}`,
              stockItemUuid: stockItem.uuid,
              hasExpiration: stockItem.hasExpiration,
              purchasePrice: stockItem.purchasePrice,
            })
          }
        />
        <DataTable rows={tableRows ?? []} headers={headers} isSortable={false} useZebraStyles>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                          isSortable: false,
                        })}
                        style={(header as CustomTableHeader)?.styles}
                        key={header.key}
                      >
                        {(() => {
                          const customHeader = header as CustomTableHeader;
                          return typeof customHeader.header === 'object' &&
                            customHeader.header !== null &&
                            'content' in customHeader.header
                            ? (customHeader.header.content as React.ReactNode)
                            : (customHeader.header as React.ReactNode);
                        })()}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        <div className={styles.btnSet}>
          {typeof onNext === 'function' && (
            <Button kind="primary" onClick={handleNext} renderIcon={ArrowRight}>
              {t('nextButton', 'Next')}
            </Button>
          )}
          {typeof onPrevious === 'function' && (
            <Button
              kind="secondary"
              onClick={onPrevious}
              renderIcon={ArrowLeft}
              hasIconOnly
              data-testid="previous-btn"
              iconDescription={t('previousButton', 'Previous')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOperationItemsFormStep;
