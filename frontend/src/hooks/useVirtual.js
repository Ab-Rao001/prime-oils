import { useState, useMemo, useCallback } from 'react';

/**
 * A lightweight virtualization hook to render large datasets with high performance.
 * 
 * @param {Object} params
 * @param {Array} params.items - Total dataset items list
 * @param {number} params.rowHeight - Row height in pixels (default: 52)
 * @param {number} params.viewportHeight - Height of scroll container in pixels (default: 400)
 */
export function useVirtualScroll({ items = [], rowHeight = 52, viewportHeight = 400 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * rowHeight;
  
  // Compute start/end indices with a buffer of 2 rows to avoid clipping on fast scrolling
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const startOffset = startIndex * rowHeight;

  return {
    visibleItems,
    totalHeight,
    startOffset,
    onScroll
  };
}

export default useVirtualScroll;
