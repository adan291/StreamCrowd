import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useLazyComponent - Hook for lazy loading components when they enter viewport
 * @requirements Task 8.1 - Implementar lazy loading de componentes
 */

export interface UseLazyComponentOptions {
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number | number[];
  /** Whether to trigger only once */
  triggerOnce?: boolean;
  /** Initial visibility state */
  initialVisible?: boolean;
  /** Delay before marking as visible (ms) */
  delay?: number;
}

export interface UseLazyComponentReturn {
  /** Ref to attach to the container element */
  ref: React.RefObject<HTMLDivElement>;
  /** Whether the component is visible */
  isVisible: boolean;
  /** Whether the component has been visible at least once */
  hasBeenVisible: boolean;
}

export function useLazyComponent(
  options: UseLazyComponentOptions = {}
): UseLazyComponentReturn {
  const {
    rootMargin = '100px',
    threshold = 0,
    triggerOnce = true,
    initialVisible = false,
    delay = 0,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [hasBeenVisible, setHasBeenVisible] = useState(initialVisible);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip if already visible and triggerOnce
    if (triggerOnce && hasBeenVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              timeoutRef.current = setTimeout(() => {
                setIsVisible(true);
                setHasBeenVisible(true);
              }, delay);
            } else {
              setIsVisible(true);
              setHasBeenVisible(true);
            }

            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setIsVisible(false);
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [rootMargin, threshold, triggerOnce, hasBeenVisible, delay]);

  return { ref, isVisible, hasBeenVisible };
}

/**
 * useIntersectionObserver - Lower-level hook for intersection observer
 */
export interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, IntersectionObserverEntry | undefined] {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    freezeOnceVisible = false,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const frozen = entry?.isIntersecting && freezeOnceVisible;

  useEffect(() => {
    const element = ref.current;
    if (!element || frozen) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [root, rootMargin, threshold, frozen]);

  return [ref, entry];
}

/**
 * LazyRender - Component wrapper for lazy rendering
 */
export interface LazyRenderProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  minHeight?: number | string;
  className?: string;
}

export const LazyRender: React.FC<LazyRenderProps> = ({
  children,
  placeholder,
  rootMargin = '100px',
  threshold = 0,
  minHeight = 100,
  className = '',
}) => {
  const { ref, hasBeenVisible } = useLazyComponent({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: hasBeenVisible ? undefined : minHeight }}
    >
      {hasBeenVisible ? children : placeholder}
    </div>
  );
};

export default useLazyComponent;
