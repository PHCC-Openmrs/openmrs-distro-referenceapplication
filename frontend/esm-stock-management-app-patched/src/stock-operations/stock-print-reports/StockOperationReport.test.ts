import { describe, it, expect, vi } from 'vitest';
import { BuildStockOperationData, formatPackagingUnit } from './StockOperationReport';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemDTO } from '../../core/api/types/stockOperation/StockOperationItemDTO';
import { OperationType } from '../../core/api/types/stockOperation/StockOperationType';

vi.mock('../../constants', () => ({ HEALTH_CENTER_NAME: 'Test HC' }));

describe('formatPackagingUnit', () => {
  it('shows the unit size like the quantity unit dropdown', () => {
    expect(formatPackagingUnit('Box', 20)).toBe('Box - 20');
    expect(formatPackagingUnit('Capsule', 1)).toBe('Capsule - 1');
  });

  it('drops trailing decimal zeros from the size', () => {
    expect(formatPackagingUnit('Box', '20.00')).toBe('Box - 20');
    expect(formatPackagingUnit('Bottle', 2.5)).toBe('Bottle - 2.5');
  });

  it('falls back to the name when the size is unknown', () => {
    expect(formatPackagingUnit('Box', null)).toBe('Box');
    expect(formatPackagingUnit('Box', undefined)).toBe('Box');
    expect(formatPackagingUnit('Box', 'abc')).toBe('Box');
  });

  it('returns nothing without a unit name', () => {
    expect(formatPackagingUnit(undefined, 20)).toBeUndefined();
  });
});

describe('BuildStockOperationData', () => {
  const item = {
    uuid: 'item-1',
    id: '1',
    stockItemName: 'Alpha Lipoic Acid',
    stockItemPackagingUOMName: 'Box',
    stockItemPackagingUOMFactor: 20,
    quantityRequestedPackagingUOMName: 'Strip',
    quantityRequestedPackagingUOMFactor: 10,
    quantity: 5,
    quantityRequested: 3,
  } as StockOperationItemDTO;

  it('prints the packaging unit with its size on an adjustment', async () => {
    const operation = { operationType: OperationType.ADJUSTMENT_OPERATION_TYPE } as StockOperationDTO;
    const data = await BuildStockOperationData(operation, [item]);
    expect(data.items[0].quantityRequiredUoM).toBe('Box - 20');
  });

  it('prints the issued unit with its size on a stock issue', async () => {
    const operation = { operationType: OperationType.STOCK_ISSUE_OPERATION_TYPE } as StockOperationDTO;
    const data = await BuildStockOperationData(operation, [item]);
    expect(data.items[0].quantityIssuedUoM).toBe('Box - 20');
  });

  it('prints requested and issued units with their sizes when fulfilling a requisition', async () => {
    const operation = { operationType: OperationType.STOCK_ISSUE_OPERATION_TYPE } as StockOperationDTO;
    const parent = { operationType: OperationType.REQUISITION_OPERATION_TYPE } as StockOperationDTO;
    const data = await BuildStockOperationData(operation, [item], parent);
    expect(data.items[0].quantityRequiredUoM).toBe('Strip - 10');
    expect(data.items[0].quantityIssuedUoM).toBe('Box - 20');
  });
});
