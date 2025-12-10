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
}

/**
 * Finds the best position for the mascot that doesn't overlap with main UI
 */
const findBestPosition = (
  currentPos: MascotPosition,
  mascotWidth: number,
  mascotHeight: number
): MascotPosition => {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const safeZones: MascotPosition[] = [
    { x: viewportWidth - mascotWidth - padding, y: padding },
    { x: viewportWidth - mascotWidth - padding, y: viewportHeight - mascotHeight - padding },
    { x: padding, y: viewportHeight - mascotHeight - padding },
    { x: padding, y: padding },
    { x: viewportWidth - mascotWidth - padding, y: viewportHeight / 2 - mascotHeight / 2 },
    { x: padding, y: viewportHeight / 2 - mascotHeight / 2 },
  ];

  const isValidPosition = (pos: MascotPosition) =>
    pos.x >= 0 &&
    pos.y >= 0 &&
    pos.x + mascotWidth <= viewportWidth &&
    pos.y + mascotHeight <= viewportHeight;

  if (isValidPosition(currentPos)) return currentPos;

  let bestZone = safeZones[0];
  let minDistance = Infinity;

  safeZones.forEach((zone) => {
    const distance = Math.sqrt(
      Math.pow(zone.x - currentPos.x, 2) + Math.pow(zone.y - currentPos.y, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      bestZone = zone;
    }
  });

  return bestZone;
};

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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    posX: number;
    posY: number;
  } | null>(null);

  // Initialize position on mount
  useEffect(() => {
    if (position.x === -1 && position.y === -1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.top });
    }
  }, [position.x, position.y]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && position.x !== -1) {
        const rect = containerRef.current.getBoundingClientRect();
        const newPos = findBestPosition(position, rect.width, rect.height);
        if (newPos.x !== position.x || newPos.y !== position.y) {
          setPosition(newPos);
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPos));
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

      let startPosX = position.x;
      let startPosY = position.y;

      if (position.x === -1 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        startPosX = rect.left;
        startPosY = rect.top;
      }

      dragStartRef.current = { x: clientX, y: clientY, posX: startPosX, posY: startPosY };
      setIsDragging(true);
    },
    [position]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStartRef.current || !containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - rect.width, dragStartRef.current.posX + deltaX)
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - rect.height, dragStartRef.current.posY + deltaY)
      );

      setPosition({ x: newX, y: newY });
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const finalPos = findBestPosition(position, rect.width, rect.height);
      setPosition(finalPos);
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(finalPos));
      onPositionChange?.(finalPos);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging, position, onPositionChange]);

  // Global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    position,
    isDragging,
    containerRef: containerRef as RefObject<HTMLDivElement>,
    handleDragStart,
  };
};

export default useMascotDrag;
