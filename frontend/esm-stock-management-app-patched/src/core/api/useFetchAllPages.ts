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
 * Backed by SWR, and keyed on the `${restBaseUrl}${resourcePath}?...` string the
 * underlying requests use (plus a marker suffix - see below), so that the app's
 * prefix-based cache invalidation (see `useHandleMutate`) refreshes these lists after
 * a create/update/delete instead of leaving them stale until the component remounts.
 */
export function useFetchAllPages<T, F extends ResourceFilterCriteria>(resourcePath: string, filter: F) {
  const apiUrl = `${restBaseUrl}${resourcePath}${toQueryParams(filter)}`;
  // A plain `useSWR(apiUrl, openmrsFetch)` call elsewhere (e.g. useStockOperations) can
  // resolve to this exact same URL when its own filter happens to be empty/default, but
  // returns a completely different shape (`{ data: { results } }` vs. this hook's flat
  // array). SWR's cache is keyed purely by string, so without a marker distinguishing
  // this key, whichever hook populates the cache first "poisons" it for the other -
  // e.g. items?.filter(...) throws because `items` came out as that other shape. The
  // marker is appended, not prepended, so the key still starts with `apiUrl` and prefix
  // invalidation keeps working.
  const key = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}__allPages`;

  const { data, error, isLoading } = useSWR<T[], Error>(key, () => fetchAllPages<T, F>(resourcePath, filter));

  return { items: (data ?? noItems) as T[], isLoading, error };
}
