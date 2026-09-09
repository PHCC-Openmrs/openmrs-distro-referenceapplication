import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

/**
 * Returns a function that invalidates every cached SWR key starting with `url`,
 * triggering a refetch of the lists/widgets built on those keys.
 *
 * This must come from `useSWRConfig()` rather than the `mutate` exported directly
 * by `swr`: every OpenMRS component renders inside `openmrsComponentDecorator`,
 * which installs a custom SWR cache provider, while the exported `mutate` stays
 * bound to SWR's default cache. Mutating through the latter never touches the
 * entries the app's hooks actually read, so it silently does nothing.
 */
export const useHandleMutate = () => {
  const { mutate } = useSWRConfig();

  return useCallback(
    (url: string) => mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true }),
    [mutate],
  );
};
