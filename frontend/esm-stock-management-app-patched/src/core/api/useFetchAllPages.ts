import useSWR from 'swr';
import { restBaseUrl } from '@openmrs/esm-framework';
import { fetchAllPages } from './fetchAllPages';
import { type ResourceFilterCriteria, toQueryParams } from './api';

// Stable reference so consumers that key effects/memos off `items` don't see a new
// array on every render while the first request is still in flight.
const noItems = [];

/**
 * React hook wrapper around {@link fetchAllPages} - loads the complete result set
 * of a paged REST resource (not just the server's first page) and re-fetches
 * whenever the filter changes.
 *
 * Backed by SWR, and keyed on the same `${restBaseUrl}${resourcePath}?...` string the
 * underlying requests use, so that the app's prefix-based cache invalidation (see
 * `useHandleMutate`) refreshes these lists after a create/update/delete instead of
 * leaving them stale until the component remounts.
 */
export function useFetchAllPages<T, F extends ResourceFilterCriteria>(resourcePath: string, filter: F) {
  const apiUrl = `${restBaseUrl}${resourcePath}${toQueryParams(filter)}`;

  const { data, error, isLoading } = useSWR<T[], Error>(apiUrl, () => fetchAllPages<T, F>(resourcePath, filter));

  return { items: (data ?? noItems) as T[], isLoading, error };
}
