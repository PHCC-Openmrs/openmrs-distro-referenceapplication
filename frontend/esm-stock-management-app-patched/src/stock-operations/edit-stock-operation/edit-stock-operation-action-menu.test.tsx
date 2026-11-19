import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import EditStockOperationActionMenu from './edit-stock-operation-action-menu.component';

vi.mock('../stock-operation.utils', () => ({
  launchStockoperationAddOrEditWorkSpace: vi.fn(),
}));

const receipt = { uuid: 'receipt-type', name: 'Receipt' };
vi.mock('../stock-operations-forms/hooks/useFilteredOperationTypesByRoles', () => ({
  default: () => ({ operationTypes: [receipt], isLoading: false, error: undefined }),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockLaunch = vi.mocked(launchStockoperationAddOrEditWorkSpace);

const rowOperation = {
  uuid: 'op-1',
  operationNumber: 'RCPT-0001',
  operationTypeUuid: 'receipt-type',
} as StockOperationDTO;

describe('EditStockOperationActionMenu', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
  });

  it('shows the row operation number without fetching the operation', () => {
    render(<EditStockOperationActionMenu stockOperation={rowOperation} showIcon={false} showprops />);
    expect(screen.getByRole('button', { name: 'RCPT-0001' })).toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('fetches the full operation when opened and launches the workspace with it', async () => {
    const fullOperation = {
      ...rowOperation,
      requisitionStockOperationUuid: 'requisition-1',
      stockOperationItems: [{ uuid: 'item-1', packagingUnits: [] }],
    } as unknown as StockOperationDTO;
    mockOpenmrsFetch.mockResolvedValue({ data: fullOperation } as any);

    render(<EditStockOperationActionMenu stockOperation={rowOperation} showIcon={false} showprops />);
    await userEvent.click(screen.getByRole('button', { name: 'RCPT-0001' }));

    await waitFor(() => expect(mockLaunch).toHaveBeenCalled());
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(`${restBaseUrl}/stockmanagement/stockoperation/op-1?v=full`);
    expect(mockLaunch).toHaveBeenCalledWith(expect.anything(), receipt, fullOperation, 'requisition-1');
  });

  it('does not launch the workspace when the operation cannot be loaded', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('boom'));

    render(<EditStockOperationActionMenu stockOperation={rowOperation} showIcon={false} showprops />);
    await userEvent.click(screen.getByRole('button', { name: 'RCPT-0001' }));

    // The button comes back once the failed fetch settles.
    expect(await screen.findByRole('button', { name: 'RCPT-0001' })).toBeInTheDocument();
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    expect(mockLaunch).not.toHaveBeenCalled();
  });
});
