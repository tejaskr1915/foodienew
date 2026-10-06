import { useState, useCallback } from 'react';

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      setLoading(false);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message || 'API request failed');
      setLoading(false);
      return { success: false, error: err };
    }
  }, [apiFunc]);

  return { data, loading, error, request };
};
export default useApi;
