import { useCallback, useEffect, useRef } from 'react';

type Timer = ReturnType<typeof setTimeout>;
type SomeFunction = (...args: any[]) => void;

/**
 *
 * @param func The original, non debounced function (You can pass any number of args to it)
 * @param delay The delay (in ms) for the function to return
 * @returns The debounced function, which will run only if the debounced function has not been called in the last (delay) ms
 */

export function useDebounce<Func extends SomeFunction>(func: Func, delay = 1000) {
  const timer = useRef<Timer>();
  const funcRef = useRef(func);
  funcRef.current = func;

  useEffect(() => {
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
    };
  }, []);

  // Stable across renders (only changes if `delay` changes) - callers that put the returned
  // function in a useEffect dependency array (e.g. to re-run when their input changes) would
  // otherwise see a new function identity on every render and have that effect fire constantly,
  // which can visibly interfere with typing in a bound search input.
  const debouncedFunction = useCallback(
    ((...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        funcRef.current(...args);
      }, delay);
    }) as Func,
    [delay],
  );

  return debouncedFunction;
}
