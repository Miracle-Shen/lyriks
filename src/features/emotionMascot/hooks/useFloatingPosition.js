import { useCallback, useEffect, useRef, useState } from 'react';

import { CLICK_DRAG_THRESHOLD, EDGE_GAP, MASCOT_SIZE } from '../config/layout';
import { clamp } from '../utils/math';

const getDefaultPosition = () => {
  if (typeof window === 'undefined') {
    return { x: EDGE_GAP, y: EDGE_GAP };
  }

  return {
    x: Math.max(EDGE_GAP, (window.innerWidth - MASCOT_SIZE) / 2),
    y: EDGE_GAP,
  };
};

export const useFloatingPosition = ({ resetKey, onClick }) => {
  const [position, setPosition] = useState(getDefaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    pointerId: null,
  });

  useEffect(() => {
    const updatePositionOnResize = () => {
      setPosition((currentPosition) => ({
        x: clamp(currentPosition.x, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - MASCOT_SIZE - EDGE_GAP)),
        y: clamp(currentPosition.y, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - MASCOT_SIZE - EDGE_GAP)),
      }));
    };

    window.addEventListener('resize', updatePositionOnResize);

    return () => {
      window.removeEventListener('resize', updatePositionOnResize);
    };
  }, []);

  useEffect(() => {
    if (!resetKey) {
      setPosition(getDefaultPosition());
    }
  }, [resetKey]);

  const handlePointerDown = useCallback((event) => {
    const targetRect = event.currentTarget.getBoundingClientRect();

    dragStateRef.current = {
      active: true,
      offsetX: event.clientX - targetRect.left,
      offsetY: event.clientY - targetRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;
      if (Math.hypot(deltaX, deltaY) > CLICK_DRAG_THRESHOLD) {
        dragStateRef.current.moved = true;
      }

      setPosition({
        x: clamp(event.clientX - dragStateRef.current.offsetX, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - MASCOT_SIZE - EDGE_GAP)),
        y: clamp(event.clientY - dragStateRef.current.offsetY, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - MASCOT_SIZE - EDGE_GAP)),
      });
    };

    const handlePointerUp = (event) => {
      if (dragStateRef.current.pointerId !== event.pointerId) return;

      if (!dragStateRef.current.moved) {
        onClick?.();
      }

      dragStateRef.current = {
        active: false,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        moved: false,
        pointerId: null,
      };
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onClick]);

  return {
    handlePointerDown,
    isDragging,
    position,
  };
};

