import { useEffect, useRef, useState } from 'react';
import { fetchAllPages } from './fetchAllPages';
import { type ResourceFilterCriteria } from './api';

/**
 * React hook wrapper around {@link fetchAllPages} - loads the complete result set
 * of a paged REST resource (not just the server's first page) and re-fetches
 * whenever the filter changes.
 */
export function useFetchAllPages<T, F extends ResourceFilterCriteria>(resourcePath: string, filter: F) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const requestId = useRef(0);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    const thisRequest = ++requestId.current;
    const controller = new AbortController();
    setIsLoading(true);
    setError(undefined);

    fetchAllPages<T, F>(resourcePath, filter, controller.signal)
      .then((all) => {
        if (thisRequest === requestId.current) {
          setItems(all);
          setIsLoading(false);
        }
      })
      .catch((e: Error) => {
        if (thisRequest === requestId.current && e?.name !== 'AbortError') {
          setError(e);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcePath, filterKey]);

  return { items, isLoading, error };
}
