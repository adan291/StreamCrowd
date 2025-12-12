// Custom hook for mascot drag & drop functionality
import React, { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import { MascotPosition } from './types';

const POSITION_STORAGE_KEY = 'ai_vision_mascot_position';

interface UseMascotDragOptions {
  initialPosition?: MascotPosition;
  onPositionChange?: (pos: MascotPosition) => void;
}

interface UseMascotDragReturn {
  position: MascotPosition;
  isDragging: boolean;
  containerRef: RefObject<HTMLDivElement>;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  screenQuadrant: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Loads saved position from localStorage
 */
const loadSavedPosition = (initialPosition?: MascotPosition): MascotPosition => {
  const saved = localStorage.getItem(POSITION_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore parse errors
    }
  }
  return initialPosition || { x: -1, y: -1 };
};

/**
 * Clamps position within viewport bounds
 */
const clampPosition = (
  x: number,
  y: number,
  width: number,
  height: number
): MascotPosition => {
  const padding = 8;
  const maxX = window.innerWidth - width - padding;
  const maxY = window.innerHeight - height - padding;
  
  return {
    x: Math.max(padding, Math.min(maxX, x)),
    y: Math.max(padding, Math.min(maxY, y)),
  };
};

/**
 * Determines which quadrant of the screen the mascot is in
 */
const getScreenQuadrant = (
  x: number,
  y: number,
  width: number,
  height: number
): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;
  
  if (centerY < midY) {
    return centerX < midX ? 'top-left' : 'top-right';
  } else {
    return centerX < midX ? 'bottom-left' : 'bottom-right';
  }
};

/**
 * Custom hook for handling mascot drag & drop
 */
export const useMascotDrag = ({
  initialPosition,
  onPositionChange,
}: UseMascotDragOptions = {}): UseMascotDragReturn => {
  const [position, setPosition] = useState<MascotPosition>(() =>
    loadSavedPosition(initialPosition)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [screenQuadrant, setScreenQuadrant] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize position on mount
  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      // Default to bottom-right corner
      const defaultX = window.innerWidth - 300;
      const defaultY = window.innerHeight - 200;
      const newPos = { x: Math.max(16, defaultX), y: Math.max(16, defaultY) };
      setPosition(newPos);
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPos));
    }
  }, []);

  // Update quadrant when position changes
  useEffect(() => {
    if (containerRef.current && position.x !== -1) {
      const rect = containerRef.current.getBoundingClientRect();
      setScreenQuadrant(getScreenQuadrant(position.x, position.y, rect.width, rect.height));
    }
  }, [position]);

  // Handle window resize - keep mascot in bounds
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && position.x !== -1) {
        const rect = containerRef.current.getBoundingClientRect();
        const clamped = clampPosition(position.x, position.y, rect.width, rect.height);
        if (clamped.x !== position.x || clamped.y !== position.y) {
          setPosition(clamped);
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(clamped));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Calculate offset from mouse to element position
      let currentX = position.x;
      let currentY = position.y;

      if (position.x === -1 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        currentX = rect.left;
        currentY = rect.top;
      }

      dragOffsetRef.current = {
        x: clientX - currentX,
        y: clientY - currentY,
      };
      
      setIsDragging(true);
    },
    [position]
  );

  // Global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Calculate new position based on mouse position minus offset
      const newX = clientX - dragOffsetRef.current.x;
      const newY = clientY - dragOffsetRef.current.y;

      // Get element dimensions for clamping
      const width = containerRef.current?.offsetWidth || 280;
      const height = containerRef.current?.offsetHeight || 150;

      // Clamp to viewport bounds
      const clamped = clampPosition(newX, newY, width, height);
      setPosition(clamped);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      
      // Save final position
      if (position.x !== -1) {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
        onPositionChange?.(position);
      }
    };

    // Use passive: false for touch events to allow preventDefault
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, position, onPositionChange]);

  return {
    position,
    isDragging,
    containerRef: containerRef as RefObject<HTMLDivElement>,
    handleDragStart,
    screenQuadrant,
  };
};

export default useMascotDrag;
