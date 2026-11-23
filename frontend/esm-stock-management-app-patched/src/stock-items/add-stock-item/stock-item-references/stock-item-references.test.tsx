import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { type StockItemReferenceDTO } from '../../../core/api/types/stockItem/StockItemReference';
import { createStockItemReference, deleteStockItemReference } from '../../stock-items.resource';
import { useStockItemReferencesHook } from './stock-item-references.resource';
import StockReferences from './stock-item-references.component';

const mockHandleMutate = vi.fn();

vi.mock('../../stock-items.resource', () => ({
  createStockItemReference: vi.fn(),
  deleteStockItemReference: vi.fn(),
}));
vi.mock('./stock-item-references.resource', () => ({ useStockItemReferencesHook: vi.fn() }));
vi.mock('../../../utils', () => ({ useHandleMutate: () => mockHandleMutate }));

// Replace the API-backed combo boxes with plain selects bound to the same form field.
// vi.hoisted so the vi.mock factories below (hoisted to the top of the file) can use it.
const { makeSelect } = vi.hoisted(() => ({
  makeSelect:
    (label: string, options: Array<{ uuid: string; name: string }>) =>
    ({ controllerName, control }: { controllerName: string; control: any }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Controller } = require('react-hook-form');
      return (
        <Controller
          name={controllerName}
          control={control}
          render={({ field: { onChange, value } }) => (
            <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
              <option value="">--</option>
              {options.map((o) => (
                <option key={o.uuid} value={o.uuid}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        />
      );
    },
}));

vi.mock('./stock-references-selector.component', () => ({
  default: makeSelect('Source', [
    { uuid: 'vendor-a', name: 'Vendor A' },
    { uuid: 'vendor-b', name: 'Vendor B' },
  ]),
}));
vi.mock('./stock-item-packaging-unit-selector.component', () => ({
  default: makeSelect('Pack size', [
    { uuid: 'box-30', name: 'Box - 30' },
    { uuid: 'box-100', name: 'Box - 100' },
  ]),
}));

const mockUseReferences = vi.mocked(useStockItemReferencesHook);
const mockCreate = vi.mocked(createStockItemReference);
const mockDelete = vi.mocked(deleteStockItemReference);
const mockShowSnackbar = vi.mocked(showSnackbar);

const savedReference: StockItemReferenceDTO = {
  uuid: 'ref-1',
  stockSourceUuid: 'vendor-a',
  stockSourceName: 'Vendor A',
  referenceCode: 'A-30',
  packagingUnitUuid: 'box-30',
  packagingUnitName: 'Box',
  packagingUnitFactor: 30,
};

function mockReferences(items: StockItemReferenceDTO[]) {
  mockUseReferences.mockReturnValue({
    items,
    totalCount: items.length,
    isLoading: false,
    error: undefined,
    setStockItemUuid: vi.fn(),
  } as any);
}

const codeInputs = () => screen.queryAllByRole('textbox');

async function fillDraft(row: number, source: string, code: string, packSize?: string) {
  const user = userEvent.setup();
  await user.selectOptions(screen.getAllByLabelText('Source')[row], source);
  await user.type(codeInputs()[row], code);
  if (packSize) {
    await user.selectOptions(screen.getAllByLabelText('Pack size')[row], packSize);
  }
}

describe('StockReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with one blank row when the item has no references', () => {
    mockReferences([]);
    render(<StockReferences stockItemUuid="item-1" />);

    expect(codeInputs()).toHaveLength(1);
    expect(screen.getByRole('button', { name: /add reference/i })).toBeInTheDocument();
  });

  it('shows saved references read-only and adds a new row per click of Add reference', async () => {
    const user = userEvent.setup();
    mockReferences([savedReference]);
    render(<StockReferences stockItemUuid="item-1" />);

    expect(screen.getByText('Vendor A')).toBeInTheDocument();
    expect(screen.getByText('A-30')).toBeInTheDocument();
    expect(screen.getByText('Box - 30')).toBeInTheDocument();
    expect(codeInputs()).toHaveLength(0);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /add reference/i }));
    await user.click(screen.getByRole('button', { name: /add reference/i }));

    expect(codeInputs()).toHaveLength(2);
  });

  it('saves every new row, one reference each, then clears them', async () => {
    const user = userEvent.setup();
    mockReferences([]);
    mockCreate.mockResolvedValue({} as any);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /add reference/i }));
    await fillDraft(0, 'vendor-a', 'A-30', 'box-30');
    await fillDraft(1, 'vendor-b', 'B-100', 'box-100');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate).toHaveBeenCalledWith({
      referenceCode: 'A-30',
      stockItemUuid: 'item-1',
      stockSourceUuid: 'vendor-a',
      packagingUnitUuid: 'box-30',
    });
    expect(mockCreate).toHaveBeenCalledWith({
      referenceCode: 'B-100',
      stockItemUuid: 'item-1',
      stockSourceUuid: 'vendor-b',
      packagingUnitUuid: 'box-100',
    });
    await waitFor(() => expect(codeInputs()).toHaveLength(0));
    expect(mockHandleMutate).toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('allows the same vendor with a different code and pack size', async () => {
    const user = userEvent.setup();
    mockReferences([savedReference]);
    mockCreate.mockResolvedValue({} as any);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /add reference/i }));
    await fillDraft(0, 'vendor-a', 'A-100', 'box-100');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  it('does not save a row without a source or code', async () => {
    const user = userEvent.setup();
    mockReferences([]);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.type(codeInputs()[0], 'A-30');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('does not save a source + code that already exists on the item', async () => {
    const user = userEvent.setup();
    mockReferences([savedReference]);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /add reference/i }));
    await fillDraft(0, 'vendor-a', 'a-30');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', subtitle: expect.stringMatching(/same code/i) }),
    );
  });

  it('keeps rows that failed to save so they can be retried', async () => {
    const user = userEvent.setup();
    mockReferences([]);
    mockCreate.mockResolvedValueOnce({} as any).mockRejectedValueOnce(new Error('Duplicate entry'));
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /add reference/i }));
    await fillDraft(0, 'vendor-a', 'A-30');
    await fillDraft(1, 'vendor-b', 'B-100');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(codeInputs()).toHaveLength(1));
    expect(codeInputs()[0]).toHaveValue('B-100');
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('removes an unsaved row without calling the server', async () => {
    const user = userEvent.setup();
    mockReferences([]);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(codeInputs()).toHaveLength(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes a saved reference and refreshes the list', async () => {
    const user = userEvent.setup();
    mockReferences([savedReference]);
    mockDelete.mockResolvedValue({} as any);
    render(<StockReferences stockItemUuid="item-1" />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockDelete).toHaveBeenCalledWith('ref-1');
    await waitFor(() => expect(mockHandleMutate).toHaveBeenCalled());
  });
});
