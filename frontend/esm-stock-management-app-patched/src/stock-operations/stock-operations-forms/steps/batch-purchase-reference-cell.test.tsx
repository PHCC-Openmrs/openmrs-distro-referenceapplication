import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useStockItemBatchNumbers } from '../hooks/useStockItemBatchNumbers';
import BatchPurchaseReferenceCell from './batch-purchase-reference-cell.component';

vi.mock('../hooks/useStockItemBatchNumbers', () => ({
  useStockItemBatchNumbers: vi.fn(),
}));

const mockUseStockItemBatchNumbers = vi.mocked(useStockItemBatchNumbers);

describe('BatchPurchaseReferenceCell', () => {
  beforeEach(() => {
    mockUseStockItemBatchNumbers.mockReturnValue({
      isLoading: false,
      stockItemBatchNos: [
        {
          uuid: 'batch-a',
          batchNo: 'A',
          quantity: '10',
          expiration: new Date(),
          stockItemUuid: 'item',
          voided: false,
          originExternalReference: 'PO:PO-1|PR:PR-1|FC:FC-1',
        },
        {
          uuid: 'batch-b',
          batchNo: 'B',
          quantity: '5',
          expiration: new Date(),
          stockItemUuid: 'item',
          voided: false,
          originExternalReference: 'FC:FC-2',
        },
        {
          uuid: 'batch-c',
          batchNo: 'C',
          quantity: '5',
          expiration: new Date(),
          stockItemUuid: 'item',
          voided: false,
        },
      ],
      setLimit: vi.fn(),
      setRepresentation: vi.fn(),
      setSearchString: vi.fn(),
    });
  });

  it("shows the code the batch inherited from its Opening Stock", () => {
    render(<BatchPurchaseReferenceCell stockItemUuid="item" stockBatchUuid="batch-a" field="purchaseOrderNo" />);
    expect(screen.getByText('PO-1')).toBeInTheDocument();
  });

  it('shows each field of the batch independently', () => {
    render(<BatchPurchaseReferenceCell stockItemUuid="item" stockBatchUuid="batch-b" field="projectFundCode" />);
    expect(screen.getByText('FC-2')).toBeInTheDocument();
  });

  it('shows -- when the origin has no value for the field', () => {
    render(<BatchPurchaseReferenceCell stockItemUuid="item" stockBatchUuid="batch-b" field="purchaseOrderNo" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows -- when the batch has no origin', () => {
    render(<BatchPurchaseReferenceCell stockItemUuid="item" stockBatchUuid="batch-c" field="purchaseOrderNo" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows -- when the batch is not in the list or none is chosen', () => {
    const { rerender } = render(
      <BatchPurchaseReferenceCell stockItemUuid="item" stockBatchUuid="missing" field="purchaseOrderNo" />,
    );
    expect(screen.getByText('--')).toBeInTheDocument();
    rerender(<BatchPurchaseReferenceCell stockItemUuid="item" field="purchaseOrderNo" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
