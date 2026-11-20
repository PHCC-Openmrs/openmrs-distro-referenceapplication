import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { OPERATIONS_BLOCK_SIZE, useStockOperationPages } from './stock-operations-table.resource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const TOTAL = 250;
const operation = (index: number) => ({ uuid: `op-${index}`, operationNumber: `ADJ-${index}` });

// Answers like the stockoperation resource: `startIndex` is a block number, `limit` the block size.
function serveBlocks(total = TOTAL) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const block = Number(params.get('startIndex') ?? 0);
    const limit = Number(params.get('limit'));
    const start = block * limit;
    const results = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => operation(start + i));
    return Promise.resolve({ data: { results, totalCount: total } } as any);
  });
}

const requestedUrls = () => mockOpenmrsFetch.mock.calls.map(([url]) => new URL(url as string, 'http://localhost'));

const wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useStockOperationPages', () => {
  beforeEach(() => serveBlocks());

  it('loads only the first block of operations, not every page', async () => {
    const { result } = renderHook(() => useStockOperationPages({ locationUuid: 'loc' }), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(10));
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);
    const [url] = requestedUrls();
    expect(url.pathname).toBe('/ws/rest/v1/stockmanagement/stockoperation');
    expect(url.searchParams.get('limit')).toBe(String(OPERATIONS_BLOCK_SIZE));
    expect(url.searchParams.get('startIndex')).toBeNull();
    expect(url.searchParams.get('locationUuid')).toBe('loc');
    expect(result.current.totalItems).toBe(TOTAL);
    expect(result.current.items[0].uuid).toBe('op-0');
  });

  it('pages within the loaded block without another request, and fetches the next block past it', async () => {
    const { result } = renderHook(() => useStockOperationPages({}), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(10));

    act(() => result.current.goTo(5));
    expect(result.current.items[0].uuid).toBe('op-40');
    expect(mockOpenmrsFetch).toHaveBeenCalledTimes(1);

    act(() => result.current.goTo(11));
    await waitFor(() => expect(result.current.items[0].uuid).toBe('op-100'));
    expect(requestedUrls()[1].searchParams.get('startIndex')).toBe('1');
  });

  it('loads both blocks when a page straddles them', async () => {
    const { result } = renderHook(() => useStockOperationPages({}), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(10));

    act(() => result.current.setPageSize(30));
    act(() => result.current.goTo(4)); // rows 90-119

    await waitFor(() => expect(result.current.items).toHaveLength(30));
    expect(result.current.items[0].uuid).toBe('op-90');
    expect(result.current.items[29].uuid).toBe('op-119');
  });

  it('does not ask for a block past the last operation', async () => {
    serveBlocks(95);
    const { result } = renderHook(() => useStockOperationPages({}), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(10));

    act(() => result.current.setPageSize(30));
    act(() => result.current.goTo(4)); // rows 90-119, only 90-94 exist

    await waitFor(() => expect(result.current.items).toHaveLength(5));
    expect(requestedUrls().every((url) => url.searchParams.get('startIndex') === null)).toBe(true);
  });

  it('searches on the server, and starts again from page 1', async () => {
    const { result, rerender } = renderHook(({ search }) => useStockOperationPages({}, search), {
      wrapper,
      initialProps: { search: '' },
    });
    await waitFor(() => expect(result.current.items).toHaveLength(10));
    act(() => result.current.goTo(3));

    rerender({ search: ' para 120 ' });

    expect(result.current.currentPage).toBe(1);
    await waitFor(() => expect(requestedUrls().some((url) => url.searchParams.get('q') === 'para 120')).toBe(true));
  });

  it('ignores search text shorter than two characters', async () => {
    const { result } = renderHook(() => useStockOperationPages({}, 'p'), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(10));
    expect(requestedUrls().every((url) => !url.searchParams.has('q'))).toBe(true);
  });
});
