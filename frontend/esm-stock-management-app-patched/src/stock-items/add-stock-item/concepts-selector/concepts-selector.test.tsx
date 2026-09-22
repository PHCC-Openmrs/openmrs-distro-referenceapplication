import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FieldValues, useForm } from 'react-hook-form';
import { openmrsFetch } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import ConceptsSelector from './concepts-selector.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const mockItems = [
  { uuid: 'concept-1', display: 'Bandage' },
  { uuid: 'concept-2', display: 'Syringe' },
  { uuid: 'concept-3', display: 'Gloves' },
];

/** Resolves like the /non-drug endpoint: filters on the `q` query param, if any. */
function respondWithMatches(url: string) {
  const query = new URL(url, 'http://localhost').searchParams.get('q');
  const results = query
    ? mockItems.filter((item) => item.display.toLowerCase().includes(query.toLowerCase()))
    : mockItems;
  return Promise.resolve({ data: { results } });
}

function ConceptsSelectorWrapper({
  defaultConceptUuid = '',
  onConceptUuidChange,
}: {
  defaultConceptUuid?: string;
  onConceptUuidChange?: (item: { uuid: string; display: string }) => void;
}) {
  const methods = useForm<FieldValues>({ defaultValues: { conceptUuid: defaultConceptUuid } });
  return (
    // A fresh cache per render keeps one test's results from leaking into the next.
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ConceptsSelector
        name="conceptUuid"
        controllerName="conceptUuid"
        control={methods.control}
        title="Please Specify"
        placeholder="Choose an item"
        onConceptUuidChange={onConceptUuidChange}
      />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockOpenmrsFetch.mockImplementation((url: string) => respondWithMatches(url) as any);
});

describe('ConceptsSelector', () => {
  it('renders the combobox with concepts', async () => {
    const user = userEvent.setup();
    render(<ConceptsSelectorWrapper />);

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Please Specify')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Bandage')).toBeInTheDocument();
    expect(screen.getByText('Syringe')).toBeInTheDocument();
    expect(screen.getByText('Gloves')).toBeInTheDocument();
  });

  it('shows a skeleton until the first page of items arrives', () => {
    mockOpenmrsFetch.mockImplementation(() => new Promise(() => {}) as any);

    render(<ConceptsSelectorWrapper />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps the typed text and stays mounted while a search is in flight', async () => {
    const user = userEvent.setup();
    render(<ConceptsSelectorWrapper />);

    const input = await screen.findByRole('combobox');
    await user.type(input, 'Glo');

    // The debounced search fires ~500ms later and refetches; the field must survive that and
    // still hold what was typed.
    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('q=Glo')));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Glo'));
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('displays the selected concept when editing with a pre-set value', async () => {
    render(<ConceptsSelectorWrapper defaultConceptUuid="concept-2" />);

    expect(await screen.findByRole('combobox')).toHaveValue('Syringe');
  });

  it('calls onConceptUuidChange when a concept is selected', async () => {
    const user = userEvent.setup();
    const onConceptUuidChange = vi.fn();

    render(<ConceptsSelectorWrapper onConceptUuidChange={onConceptUuidChange} />);

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('Gloves'));

    expect(onConceptUuidChange).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'concept-3' }));
  });

  it('keeps showing the selection after a later search no longer returns it', async () => {
    const user = userEvent.setup();
    render(<ConceptsSelectorWrapper />);

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('Gloves'));
    expect(screen.getByRole('combobox')).toHaveValue('Gloves');

    // "Bandage" results contain no Gloves, but the picked item must not be blanked out.
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'Bandage');
    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('q=Bandage')));

    await user.click(screen.getByText('Bandage'));
    expect(screen.getByRole('combobox')).toHaveValue('Bandage');
  });

  it('clears the form value when the selection is cleared', async () => {
    const user = userEvent.setup();
    render(<ConceptsSelectorWrapper defaultConceptUuid="concept-1" />);

    const input = await screen.findByRole('combobox');
    expect(input).toHaveValue('Bandage');

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(input).toHaveValue('');
  });
});
