import { useState, useCallback, useEffect } from "react";

/**
 * usePagination Hook
 * Manages pagination state for tables
 */
export function usePagination({ initialSize = 10, initialPage = 0 } = {}) {
  const [pagination, setPagination] = useState({
    pageIndex: initialPage,
    pageSize: initialSize,
  });

  return {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    pagination,
    setPagination,
  };
}

/**
 * useFormState Hook
 * Manages form state with updates
 */
export function useFormState(initialState = {}) {
  const [formState, setFormState] = useState(initialState);

  const handleChange = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, [initialState]);

  return [formState, handleChange, resetForm];
}

/**
 * useDebounce Hook
 * Debounces a value with configurable delay
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

/**
 * useDateRange Hook
 * Manages date range state
 */
export function useDateRange({ initialStartDate, initialEndDate } = {}) {
  const [range, setRange] = useState({
    from: initialStartDate,
    to: initialEndDate,
  });

  const updateRange = useCallback((newRange) => {
    setRange(newRange);
  }, []);

  const resetRange = useCallback(() => {
    setRange({
      from: initialStartDate,
      to: initialEndDate,
    });
  }, [initialStartDate, initialEndDate]);

  return {
    range,
    updateRange,
    resetRange,
  };
}

/**
 * useSnack Hook (Toast notifications)
 * Wrapper around toast library
 */
export function useSnack() {
  const showSuccess = useCallback((message) => {
    // Import dynamically to avoid circular dependencies
    import("sonner").then(({ toast }) => toast.success(message));
  }, []);

  const showError = useCallback((message) => {
    import("sonner").then(({ toast }) => toast.error(message));
  }, []);

  const showInfo = useCallback((message) => {
    import("sonner").then(({ toast }) => toast.info(message));
  }, []);

  return {
    showSuccess,
    showError,
    showInfo,
  };
}

/**
 * useLocalPagination Hook
 * Client-side pagination for data arrays
 */
export function useLocalPagination(data = [], pagination) {
  const { pageIndex, pageSize } = pagination;
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  return data.slice(start, end);
}

/**
 * useSorting Hook
 * Manages sorting state for tables
 */
export function useSorting(initialSorting = []) {
  const [sorting, setSorting] = useState(initialSorting);

  return {
    sorting,
    setSorting,
  };
}
