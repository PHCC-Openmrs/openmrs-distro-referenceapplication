import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type ResourceFilterCriteria, toQueryParams } from './api';
import { type PageableResult } from './types/PageableResult';

// Requests are chunked at this size and looped until the server reports no more
// results, rather than requesting everything in one call - a single request larger
// than the REST module's webservices.rest.maxResultsAbsolute setting is rejected
// outright by the server, and that setting is admin-configurable so it can't be
// relied on to stay above any particular catalog size.
const PAGE_FETCH_SIZE = 100;

/**
 * Fetches every page of a `PageableResult` REST resource and returns the full,
 * concatenated result set - use for widgets/lists that need a true total
 * (counts, "out of stock", pagination totals), not just the server's first page.
 */
export async function fetchAllPages<T, F extends ResourceFilterCriteria>(
  resourcePath: string,
  filter: F,
  signal?: AbortSignal,
): Promise<T[]> {
  // The stock management REST resources treat `startIndex` as a page NUMBER
  // (actual offset = startIndex * limit), not a raw record offset like most
  // other OpenMRS REST resources - confirmed by comparing consecutive pages'
  // result UUIDs (page 0's last item is immediately followed by page 1's
  // first item only when startIndex increments by 1, not by the page size).
  let page = 0;
  let all: T[] = [];
  while (true) {
    const pageFilter = { ...filter, startIndex: page, limit: PAGE_FETCH_SIZE, totalCount: true };
    const apiUrl = `${restBaseUrl}${resourcePath}${toQueryParams(pageFilter)}`;
    const { data } = await openmrsFetch<PageableResult<T>>(apiUrl, { signal });
    const results = data.results ?? [];
    all = all.concat(results);
    const total = data.totalCount ?? all.length;
    if (results.length === 0 || all.length >= total) {
      break;
    }
    page += 1;
  }
  return all;
}
