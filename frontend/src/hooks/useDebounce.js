import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapid value updates (e.g. search input strokes).
 * 
 * @param {any} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
