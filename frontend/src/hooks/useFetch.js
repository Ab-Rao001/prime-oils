import { useState, useEffect, useCallback } from 'react';

/** Fetch API data once; no mock fallback. */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const processResult = (result) => {
    if (result && typeof result === 'object' && Array.isArray(result.data)) {
      setData(result.data);
      if (result.pagination) setPagination(result.pagination);
    } else {
      setData(Array.isArray(result) ? result : result ?? []);
    }
  };

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetcher()
      .then(result => {
        processResult(result);
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
        if (!cancelled) processResult(result);
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

  return { data, setData, pagination, loading, error, reload };
}
