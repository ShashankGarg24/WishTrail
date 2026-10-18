import { useCallback, useEffect, useRef, useState } from "react";

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Ignore late responses after filters, detail IDs, or routes change.
export function useAdminResource(loader, key = "") {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const keyRef = useRef(key);
  keyRef.current = key;
  const sequence = useRef(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
    key,
  });
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const requestKey = keyRef.current;
    setState((previous) => ({
      ...previous,
      loading: true,
      error: "",
      key: requestKey,
    }));
    try {
      const response = await loaderRef.current();
      if (request === sequence.current && requestKey === keyRef.current)
        setState({
          data: response.data.data,
          loading: false,
          error: "",
          key: requestKey,
        });
    } catch (error) {
      if (request === sequence.current && requestKey === keyRef.current)
        setState({
          key: requestKey,
          data: null,
          loading: false,
          error:
            error.response?.data?.message ||
            "Unable to load data. Please try again.",
        });
    }
  }, []);
  useEffect(() => {
    refresh();
    return () => {
      sequence.current++;
    };
  }, [key, refresh]);
  return { ...state, loading: state.loading || state.key !== key, refresh };
}
