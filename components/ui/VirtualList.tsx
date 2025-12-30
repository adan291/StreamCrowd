import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * VirtualList - Virtualized list for rendering large datasets efficiently
 * @requirements Task 8.3 - Virtualizar listas largas
 */

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyMessage?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  onEndReached,
  endReachedThreshold = 200,
  emptyMessage = 'No items',
  keyExtractor = (_, index) => index,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const endReachedCalledRef = useRef(false);

  // Calculate item heights and positions
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: { top: number; height: number }[] = [];
    let currentTop = 0;

    items.forEach((item, index) => {
      const height = typeof itemHeight === 'function' 
        ? itemHeight(item, index) 
        : itemHeight;
      positions.push({ top: currentTop, height });
      currentTop += height;
    });

    return { totalHeight: currentTop, itemPositions: positions };
  }, [items, itemHeight]);

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: 0 };

    let start = 0;
    let end = items.length - 1;

    // Binary search for start index
    let low = 0;
    let high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const pos = itemPositions[mid];
      if (pos.top + pos.height < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    start = Math.max(0, low - overscan);

    // Binary search for end index
    low = 0;
    high = items.length - 1;
    const viewportBottom = scrollTop + containerHeight;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const pos = itemPositions[mid];
      if (pos.top < viewportBottom) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    end = Math.min(items.length - 1, low + overscan);

    return { startIndex: start, endIndex: end };
  }, [items.length, itemPositions, scrollTop, containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if end reached
    if (onEndReached) {
      const distanceFromEnd = totalHeight - (target.scrollTop + target.clientHeight);
      if (distanceFromEnd < endReachedThreshold && !endReachedCalledRef.current) {
        endReachedCalledRef.current = true;
        onEndReached();
      } else if (distanceFromEnd >= endReachedThreshold) {
        endReachedCalledRef.current = false;
      }
    }
  }, [totalHeight, onEndReached, endReachedThreshold]);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Reset end reached when items change
  useEffect(() => {
    endReachedCalledRef.current = false;
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-zinc-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  // Render visible items
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    const position = itemPositions[i];
    const style: React.CSSProperties = {
      position: 'absolute',
      top: position.top,
      left: 0,
      right: 0,
      height: position.height,
    };
    visibleItems.push(
      <React.Fragment key={keyExtractor(item, i)}>
        {renderItem(item, i, style)}
      </React.Fragment>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * SimpleVirtualList - Simplified virtual list with fixed item height
 */
export interface SimpleVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: React.ReactNode;
}

export function SimpleVirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  emptyMessage,
}: SimpleVirtualListProps<T>) {
  return (
    <VirtualList
      items={items}
      itemHeight={itemHeight}
      renderItem={(item, index, style) => (
        <div style={style}>{renderItem(item, index)}</div>
      )}
      className={className}
      emptyMessage={emptyMessage}
    />
  );
}

export default VirtualList;
