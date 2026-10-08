import { useState, useEffect } from 'react';

/** Delays a fast-changing value, so a search box does not fire a request per keystroke. */
export const useDebounce = <T>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
