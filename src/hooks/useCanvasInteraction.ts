import React, { useRef, useState, useEffect, useCallback } from "react";
import { CanvasElement, LevelColumnElement, RoomElement } from "../types";

export interface CanvasTransform {
  pan: { x: number; y: number };
  zoom: number;
}

export interface UseCanvasInteractionProps {
  initialPan: { x: number; y: number };
  initialZoom: number;
  onViewportChange?: (pan: { x: number; y: number }, zoom: number) => void;
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelectElements: (ids: string[], multi?: boolean) => void;
  onUpdateElementPosition: (id: string, x: number, y: number) => void;
  onDropRoomIntoColumn?: (roomId: string, targetColumnId: string | null) => void;
  activeTool: string;
  snapToGrid: boolean;
  gridSnapM: number;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onAddDimensionPoint?: (point: { x: number; y: number }) => void;
}

export interface ActivePointer {
  id: number;
  x: number;
  y: number;
  pointerType: string;
}

export function useCanvasInteraction({
  initialPan,
  initialZoom,
  onViewportChange,
  elements,
  selectedElementIds,
  onSelectElements,
  onUpdateElementPosition,
  onDropRoomIntoColumn,
  activeTool,
  snapToGrid,
  gridSnapM,
  onDeleteSelected,
  onDuplicateSelected,
  onAddDimensionPoint,
}: UseCanvasInteractionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>(initialPan);
  const [zoom, setZoom] = useState<number>(initialZoom);

  // Spacebar key tracking for pan shortcut
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Dragging / Panning modes
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  // Element dragging
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const dragStartOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Marquee Selection
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Multi-touch tracking for trackpad & touch screens (pinch-to-zoom & two-finger pan)
  const activePointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const pinchCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync pan & zoom when initial values change (e.g. switching sub-boards)
  useEffect(() => {
    setPan(initialPan);
    setZoom(initialZoom);
  }, [initialPan.x, initialPan.y, initialZoom]);

  // Debounced notification of viewport change
  useEffect(() => {
    const timer = setTimeout(() => {
      onViewportChange?.(pan, zoom);
    }, 300);
    return () => clearTimeout(timer);
  }, [pan, zoom, onViewportChange]);

  // Keyboard Shortcuts (Space to pan, Backspace/Delete to delete, Ctrl+D duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        onDeleteSelected?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onDuplicateSelected?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onDeleteSelected, onDuplicateSelected]);

  // Convert client screen coordinate (clientX, clientY) accurately into World Canvas coordinate
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  // Convert World Canvas coordinate to client screen coordinate
  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        clientX: worldX * zoom + pan.x + rect.left,
        clientY: worldY * zoom + pan.y + rect.top,
      };
    },
    [pan.x, pan.y, zoom]
  );

  // Zoom centered on a specific screen pivot (mouseX, mouseY)
  const zoomAtPoint = useCallback(
    (newZoom: number, clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clampedZoom = Math.min(3.0, Math.max(0.15, newZoom));
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Maintain focal point under cursor:
      // worldX = (mouseX - pan.x) / zoom == (mouseX - newPan.x) / clampedZoom
      const newPanX = mouseX - (mouseX - pan.x) * (clampedZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (clampedZoom / zoom);

      setZoom(clampedZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [pan.x, pan.y, zoom]
  );

  // Wheel event for trackpad pinch & mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      // Trackpad pinch gesture sends ctrlKey === true
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        zoomAtPoint(zoom * factor, e.clientX, e.clientY);
        return;
      }

      // Standard mouse wheel zooming vs shift horizontal scroll
      if (!e.shiftKey) {
        const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
        zoomAtPoint(zoom * zoomDelta, e.clientX, e.clientY);
      } else {
        // Shift + Wheel = Horizontal Pan
        setPan((prev) => ({ ...prev, x: prev.x - e.deltaY }));
      }
    },
    [zoom, zoomAtPoint]
  );

  // -------------------------------------------------------------
  // HTML5 POINTER EVENTS FOR MOUSE, TRACKPAD, TOUCH, & TABLETS
  // -------------------------------------------------------------

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pointerId = e.pointerId;
      const pointers = activePointersRef.current;
      pointers.set(pointerId, {
        id: pointerId,
        x: e.clientX,
        y: e.clientY,
        pointerType: e.pointerType,
      });

      // 1. Two-finger touch gesture started (Pinch to zoom / 2-finger pan)
      if (pointers.size === 2) {
        const ptrs: ActivePointer[] = Array.from(pointers.values());
        if (ptrs[0] && ptrs[1]) {
          const dx = ptrs[0].x - ptrs[1].x;
          const dy = ptrs[0].y - ptrs[1].y;
          pinchStartDistanceRef.current = Math.hypot(dx, dy);
          pinchStartZoomRef.current = zoom;
          pinchCenterRef.current = {
            x: (ptrs[0].x + ptrs[1].x) / 2,
            y: (ptrs[0].y + ptrs[1].y) / 2,
          };
          setIsPanning(true);
          startPanRef.current = {
            clientX: pinchCenterRef.current.x,
            clientY: pinchCenterRef.current.y,
            panX: pan.x,
            panY: pan.y,
          };
        }
        return;
      }

      // If active tool is dimension ruler or section cut, capture click point
      if (activeTool === "dimension_ruler" || activeTool === "section_cut") {
        const world = screenToWorld(e.clientX, e.clientY);
        onAddDimensionPoint?.(world);
        return;
      }

      // Check if panning trigger:
      // - Middle click (button 1)
      // - Right click (button 2)
      // - Spacebar held + Left click
      // - Pan tool active
      const isPanTrigger =
        e.button === 1 ||
        e.button === 2 ||
        isSpacePressed ||
        activeTool === "pan";

      if (isPanTrigger) {
        setIsPanning(true);
        startPanRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        // Capture pointer to continue panning even outside canvas
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch (_) {}
        return;
      }

      // Left click on canvas background (Marquee selection or deselect)
      if (e.button === 0) {
        const isCanvasBackground =
          e.target === containerRef.current ||
          (e.target as HTMLElement).id === "canvas-plane" ||
          (e.target as HTMLElement).tagName === "svg";

        if (isCanvasBackground) {
          if (!e.shiftKey) {
            onSelectElements([]);
          }
          const world = screenToWorld(e.clientX, e.clientY);
          setIsMarquee(true);
          setMarqueeStart(world);
          setMarqueeEnd(world);
        }
      }
    },
    [
      zoom,
      pan.x,
      pan.y,
      activeTool,
      isSpacePressed,
      screenToWorld,
      onAddDimensionPoint,
      onSelectElements,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pointers = activePointersRef.current;
      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          pointerType: e.pointerType,
        });
      }

      // 1. Two-finger touch gesture handling (Pinch-to-zoom & two-finger drag)
      if (pointers.size === 2 && pinchStartDistanceRef.current !== null) {
        const ptrs: ActivePointer[] = Array.from(pointers.values());
        if (ptrs[0] && ptrs[1]) {
          const currentDist = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y);
          const scale = currentDist / pinchStartDistanceRef.current;
          const currentCenter = {
            x: (ptrs[0].x + ptrs[1].x) / 2,
            y: (ptrs[0].y + ptrs[1].y) / 2,
          };

          const targetZoom = Math.min(3.0, Math.max(0.15, pinchStartZoomRef.current * scale));
          
          // Panning delta from initial center
          const dx = currentCenter.x - startPanRef.current.clientX;
          const dy = currentCenter.y - startPanRef.current.clientY;

          setZoom(targetZoom);
          setPan({
            x: startPanRef.current.panX + dx,
            y: startPanRef.current.panY + dy,
          });
        }
        return;
      }

      // 2. Single Pointer Panning
      if (isPanning) {
        const dx = e.clientX - startPanRef.current.clientX;
        const dy = e.clientY - startPanRef.current.clientY;
        setPan({
          x: startPanRef.current.panX + dx,
          y: startPanRef.current.panY + dy,
        });
        return;
      }

      // 3. Marquee Selection Drag
      if (isMarquee) {
        const world = screenToWorld(e.clientX, e.clientY);
        setMarqueeEnd(world);
        return;
      }

      // 4. Element Dragging
      if (draggingElementId) {
        const world = screenToWorld(e.clientX, e.clientY);
        let rawX = world.x - dragStartOffsetRef.current.offsetX;
        let rawY = world.y - dragStartOffsetRef.current.offsetY;

        // Metric grid snapping (1m = 40px base unit)
        if (snapToGrid) {
          const snapPx = 40 * gridSnapM;
          rawX = Math.round(rawX / snapPx) * snapPx;
          rawY = Math.round(rawY / snapPx) * snapPx;
        }

        onUpdateElementPosition(draggingElementId, rawX, rawY);

        // Check containment collision with Level Columns
        const draggedElem = elements.find((el) => el.id === draggingElementId);
        if (draggedElem && draggedElem.type === "room_bubble") {
          const columns = elements.filter(
            (el): el is LevelColumnElement => el.type === "level_column"
          );
          const hitCol = columns.find(
            (col) =>
              rawX + draggedElem.width / 2 >= col.x &&
              rawX + draggedElem.width / 2 <= col.x + col.width &&
              rawY + 40 >= col.y &&
              rawY <= col.y + col.height
          );
          setHoveredColumnId(hitCol ? hitCol.id : null);
        }
      }
    },
    [
      isPanning,
      isMarquee,
      draggingElementId,
      snapToGrid,
      gridSnapM,
      screenToWorld,
      onUpdateElementPosition,
      elements,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);

      if (activePointersRef.current.size < 2) {
        pinchStartDistanceRef.current = null;
      }

      if (isPanning) {
        setIsPanning(false);
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      if (isMarquee) {
        setIsMarquee(false);
        const minX = Math.min(marqueeStart.x, marqueeEnd.x);
        const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
        const minY = Math.min(marqueeStart.y, marqueeEnd.y);
        const maxY = Math.max(marqueeStart.y, marqueeEnd.y);

        // Only select if dragged more than 5px to prevent click mis-triggers
        if (maxX - minX > 5 || maxY - minY > 5) {
          const insideIds = elements
            .filter((el) => {
              const elCenterX = el.x + el.width / 2;
              const elCenterY = el.y + el.height / 2;
              return (
                elCenterX >= minX &&
                elCenterX <= maxX &&
                elCenterY >= minY &&
                elCenterY <= maxY
              );
            })
            .map((el) => el.id);

          onSelectElements(insideIds);
        }
      }

      if (draggingElementId) {
        const draggedElem = elements.find((el) => el.id === draggingElementId);
        if (draggedElem && draggedElem.type === "room_bubble") {
          if (hoveredColumnId) {
            onDropRoomIntoColumn?.(draggedElem.id, hoveredColumnId);
          } else {
            // If moved out of all columns, decouple
            const columns = elements.filter(
              (el): el is LevelColumnElement => el.type === "level_column"
            );
            const isStillInsideCurrent = columns.some(
              (col) =>
                col.id === (draggedElem as RoomElement).parentColumnId &&
                draggedElem.x + draggedElem.width / 2 >= col.x &&
                draggedElem.x + draggedElem.width / 2 <= col.x + col.width &&
                draggedElem.y >= col.y &&
                draggedElem.y <= col.y + col.height
            );
            if (
              !isStillInsideCurrent &&
              (draggedElem as RoomElement).parentColumnId
            ) {
              onDropRoomIntoColumn?.(draggedElem.id, null);
            }
          }
        }

        setDraggingElementId(null);
        setHoveredColumnId(null);
      }
    },
    [
      isPanning,
      isMarquee,
      marqueeStart.x,
      marqueeStart.y,
      marqueeEnd.x,
      marqueeEnd.y,
      draggingElementId,
      elements,
      hoveredColumnId,
      onSelectElements,
      onDropRoomIntoColumn,
    ]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    setIsPanning(false);
    setIsMarquee(false);
    setDraggingElementId(null);
    setHoveredColumnId(null);
    pinchStartDistanceRef.current = null;
  }, []);

  // Handler for starting drag on an element card
  const startElementDrag = useCallback(
    (e: React.PointerEvent | React.MouseEvent, element: CanvasElement) => {
      // Don't drag if interactive child target was clicked (input, button, etc.)
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest(".no-drag")
      ) {
        return;
      }

      e.stopPropagation();
      if (activeTool === "pan" || isSpacePressed) return;

      onSelectElements([element.id], (e as any).shiftKey);

      const world = screenToWorld(e.clientX, e.clientY);
      setDraggingElementId(element.id);
      dragStartOffsetRef.current = {
        offsetX: world.x - element.x,
        offsetY: world.y - element.y,
      };
    },
    [activeTool, isSpacePressed, onSelectElements, screenToWorld]
  );

  return {
    containerRef,
    pan,
    setPan,
    zoom,
    setZoom,
    isPanning: isPanning || isSpacePressed,
    isSpacePressed,
    isMarquee,
    marqueeStart,
    marqueeEnd,
    draggingElementId,
    hoveredColumnId,
    screenToWorld,
    worldToScreen,
    zoomAtPoint,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    startElementDrag,
  };
}
