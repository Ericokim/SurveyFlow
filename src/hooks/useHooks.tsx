import type { SortingState } from "@tanstack/react-table";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";

export function useSorting(initialSorting: SortingState = []) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  return { sorting, setSorting };
}

export function useDebouncedValue<TValue>(value: TValue, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useLayoutEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useStickyScrollbar<TElement extends HTMLElement>() {
  const [element, setElement] = useState<TElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);

  const ref = useCallback((node: TElement | null) => {
    setElement(node);
  }, []);

  useLayoutEffect(() => {
    if (!element) return;

    const update = () => {
      setCanScroll(element.scrollWidth > element.clientWidth);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return useMemo(() => ({ ref, canScroll }), [ref, canScroll]);
}
