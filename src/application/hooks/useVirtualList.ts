/**
 * useVirtualList Hook
 * 
 * Simple virtualization hook for rendering large lists efficiently.
 * Only renders items that are visible in the viewport.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface VirtualListOptions {
  /** Total number of items */
  itemCount: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Number of items to render above/below visible area (default: 3) */
  overscan?: number;
}

export interface VirtualListResult {
  /** Items to render (start index, end index) */
  virtualItems: { index: number; offsetTop: number }[];
  /** Total height of all items */
  totalHeight: number;
  /** Current scroll offset */
  scrollOffset: number;
  /** Handler for scroll events */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  /** Ref for the scroll container */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for virtualizing large lists
 * 
 * @example
 * ```tsx
 * const { virtualItems, totalHeight, onScroll, containerRef } = useVirtualList({
 *   itemCount: items.length,
 *   itemHeight: 80,
 *   containerHeight: 400,
 * });
 * 
 * return (
 *   <div ref={containerRef} onScroll={onScroll} style={{ height: 400, overflow: 'auto' }}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       {virtualItems.map(({ index, offsetTop }) => (
 *         <div key={index} style={{ position: 'absolute', top: offsetTop, height: 80 }}>
 *           {items[index]}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualList(options: VirtualListOptions): VirtualListResult {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = itemCount * itemHeight;

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);

    const items: { index: number; offsetTop: number }[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }
    return items;
  }, [scrollOffset, itemHeight, containerHeight, itemCount, overscan]);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollOffset(e.currentTarget.scrollTop);
  }, []);

  // Reset scroll when item count changes significantly
  useEffect(() => {
    if (containerRef.current && scrollOffset > totalHeight) {
      containerRef.current.scrollTop = 0;
      setScrollOffset(0);
    }
  }, [itemCount, totalHeight, scrollOffset]);

  return {
    virtualItems,
    totalHeight,
    scrollOffset,
    onScroll,
    containerRef,
  };
}

/**
 * Check if virtualization should be used based on item count
 * @param itemCount - Number of items
 * @param threshold - Minimum items to enable virtualization (default: 50)
 */
export function shouldVirtualize(itemCount: number, threshold: number = 50): boolean {
  return itemCount >= threshold;
}

export default useVirtualList;
