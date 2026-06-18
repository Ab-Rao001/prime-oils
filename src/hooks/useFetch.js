import { useState, useEffect, useCallback } from 'react';

/** Fetch API data once; no mock fallback. */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetcher()
      .then(result => {
        setData(Array.isArray(result) ? result : result ?? []);
        return result;
      })
      .catch(err => {
        setError(err);
        setData([]);
        throw err;
      })
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(result => {
        if (!cancelled) setData(Array.isArray(result) ? result : result ?? []);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, deps);

  return { data, setData, loading, error, reload };
}
