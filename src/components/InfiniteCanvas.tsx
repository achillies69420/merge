import React, { useState, useCallback } from "react";
import { useStudio } from "../context/StudioContext";
import { CanvasElement, LevelColumnElement, RoomElement } from "../types";
import { LevelColumnCard } from "./cards/LevelColumnCard";
import { RoomBubbleCard } from "./cards/RoomBubbleCard";
import { PrecedentCard } from "./cards/PrecedentCard";
import { SolarCompassCard } from "./cards/SolarCompassCard";
import { NoteCard } from "./cards/NoteCard";
import { MediaCard } from "./cards/MediaCard";
import { TracePaperCard } from "./cards/TracePaperCard";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import {
  Ruler,
  Maximize2,
  Box,
  Share2,
  Layers,
  Sparkles,
  Compass,
  FileSpreadsheet,
  SplitSquareVertical,
  Wind,
  Plus,
  Trash2,
} from "lucide-react";

export const InfiniteCanvas: React.FC = () => {
  const {
    activeBoard,
    boardElements,
    boardConnectors,
    boardDimensions,
    boardSectionCuts,
    selectedElementIds,
    setSelectedElementIds,
    toggleSelectElement,
    activeTool,
    setActiveTool,
    gridMode,
    snapToGrid,
    gridSnapM,
    project,
    updateBoardViewport,
    updateElementPosition,
    moveRoomToColumn,
    deleteSelected,
    duplicateSelected,
    addDimension,
    removeDimension,
    clearDimensions,
    addSectionCut,
    removeSectionCut,
    autoClusterLayout,
    setActiveModal,
    selectedConnectorId,
    setSelectedConnectorId,
    updateConnector,
    removeConnector,
    connectingSourceId,
    setConnectingSourceId,
    activeConnectorType,
  } = useStudio();

  // Dimension & Section Drafting state
  const [draftStartPoint, setDraftStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingControl, setIsDraggingControl] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleAddDimensionPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (activeTool === "dimension_ruler") {
        if (!draftStartPoint) {
          setDraftStartPoint(point);
        } else {
          const dx = point.x - draftStartPoint.x;
          const dy = point.y - draftStartPoint.y;
          const distPx = Math.hypot(dx, dy);
          // Scale: 40px = 1m at 1:100 scale
          const distanceM = Number((distPx / 40).toFixed(2));
          let clearanceStatus: "compliant" | "tight" | "non_compliant" = "compliant";
          if (distanceM < 0.9) clearanceStatus = "non_compliant"; // Sub-standard corridor/door
          else if (distanceM < 1.2) clearanceStatus = "tight";

          addDimension({
            x1: Math.round(draftStartPoint.x),
            y1: Math.round(draftStartPoint.y),
            x2: Math.round(point.x),
            y2: Math.round(point.y),
            distanceM,
            label: `${distanceM}m`,
            clearanceStatus,
          });
          setDraftStartPoint(null);
          setActiveTool("select");
        }
      } else if (activeTool === "section_cut") {
        if (!draftStartPoint) {
          setDraftStartPoint(point);
        } else {
          const cutCount = (boardSectionCuts?.length || 0) + 1;
          const label = `Section ${String.fromCharCode(64 + cutCount)}-${String.fromCharCode(64 + cutCount)}`;
          addSectionCut({
            x1: Math.round(draftStartPoint.x),
            y1: Math.round(draftStartPoint.y),
            x2: Math.round(point.x),
            y2: Math.round(point.y),
            label,
          });
          setDraftStartPoint(null);
          setActiveTool("select");
          setActiveModal("building_section");
        }
      }
    },
    [activeTool, draftStartPoint, addDimension, addSectionCut, boardSectionCuts, setActiveTool, setActiveModal]
  );

  const {
    containerRef,
    pan,
    zoom,
    isPanning,
    isMarquee,
    marqueeStart,
    marqueeEnd,
    hoveredColumnId,
    screenToWorld,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    startElementDrag,
  } = useCanvasInteraction({
    initialPan: activeBoard.pan || { x: 0, y: 0 },
    initialZoom: activeBoard.zoom || 1,
    onViewportChange: (newPan, newZoom) => {
      updateBoardViewport(activeBoard.id, newPan, newZoom);
    },
    elements: boardElements,
    selectedElementIds,
    onSelectElements: (ids, multi) => {
      if (multi) {
        setSelectedElementIds(
          ids.length === 1 && selectedElementIds.includes(ids[0])
            ? selectedElementIds.filter((id) => id !== ids[0])
            : Array.from(new Set([...selectedElementIds, ...ids]))
        );
      } else {
        setSelectedElementIds(ids);
      }
      if (ids.length > 0) setSelectedConnectorId(null);
    },
    onUpdateElementPosition: updateElementPosition,
    onDropRoomIntoColumn: moveRoomToColumn,
    activeTool,
    snapToGrid,
    gridSnapM,
    onDeleteSelected: deleteSelected,
    onDuplicateSelected: duplicateSelected,
    onAddDimensionPoint: handleAddDimensionPoint,
  });

  // Track live pointer for interactive connector curve bending
  const onPointerMoveWrapper = (e: React.PointerEvent) => {
    handlePointerMove(e);
    const world = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(world);

    if (isDraggingControl) {
      const conn = boardConnectors.find((c) => c.id === isDraggingControl);
      if (conn) {
        const src = boardElements.find((el) => el.id === conn.sourceId);
        const tgt = boardElements.find((el) => el.id === conn.targetId);
        if (src && tgt) {
          const rawMidX = (src.x + src.width / 2 + tgt.x + tgt.width / 2) / 2;
          const rawMidY = (src.y + src.height / 2 + tgt.y + tgt.height / 2) / 2;
          const offsetX = Math.round(world.x - rawMidX);
          const offsetY = Math.round(world.y - rawMidY);
          updateConnector(conn.id, { controlOffset: { x: offsetX, y: offsetY } });
        }
      }
    }
  };

  const onPointerUpWrapper = (e: React.PointerEvent) => {
    handlePointerUp(e);
    if (isDraggingControl) {
      setIsDraggingControl(null);
    }
  };

  // Render Bezier Connector Curves with Interactive Control Grips & Dynamic Bending
  const renderConnectors = () => {
    return boardConnectors.map((conn) => {
      const src = boardElements.find((e) => e.id === conn.sourceId);
      const tgt = boardElements.find((e) => e.id === conn.targetId);
      if (!src || !tgt) return null;

      const isSelected = selectedConnectorId === conn.id;

      const x1 = src.x + src.width / 2;
      const y1 = src.y + src.height / 2;
      const x2 = tgt.x + tgt.width / 2;
      const y2 = tgt.y + tgt.height / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;

      const offX = conn.controlOffset?.x || 0;
      const offY = conn.controlOffset?.y || 0;

      const cx1 = x1 + dx * 0.5 + offX;
      const cy1 = y1 + offY;
      const cx2 = x1 + dx * 0.5 + offX;
      const cy2 = y2 + offY;

      const midX = (x1 + x2) / 2 + offX;
      const midY = (y1 + y2) / 2 + offY;

      let strokeColor = "#10b981"; // Direct Access (Emerald)
      let strokeDash = "none";
      let strokeWidth = 2.5;

      if (conn.type === "visual_link") {
        strokeColor = "#38bdf8"; // Sky blue
        strokeDash = "6,4";
        strokeWidth = 2.5;
      } else if (conn.type === "acoustic_conflict") {
        strokeColor = "#f43f5e"; // Rose / Red
        strokeDash = "4,3";
        strokeWidth = 3;
      } else if (conn.type === "service_link") {
        strokeColor = "#fbbf24"; // Amber
        strokeDash = "8,4";
        strokeWidth = 2.5;
      }

      if (isSelected) {
        strokeWidth = 4.5;
      }

      return (
        <g
          key={conn.id}
          className="pointer-events-auto group cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedConnectorId(conn.id);
            setSelectedElementIds([]);
          }}
        >
          {/* Broad invisible stroke for effortless hovering and clicking */}
          <path
            d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
            fill="none"
            stroke="transparent"
            strokeWidth="28"
          />

          {/* Halo Glow for Selected Line */}
          {isSelected && (
            <path
              d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={strokeWidth + 4}
              strokeOpacity="0.4"
            />
          )}

          {/* Visible Styled Bezier Curve */}
          <path
            d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
            fill="none"
            stroke={isSelected ? "#fbbf24" : strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="transition-all opacity-90 group-hover:opacity-100"
          />

          {/* Node Terminal Endpoints */}
          <circle cx={x1} cy={y1} r="5" fill={strokeColor} stroke="#fff" strokeWidth="1.5" />
          <circle cx={x2} cy={y2} r="5" fill={strokeColor} stroke="#fff" strokeWidth="1.5" />

          {/* Interactive Draggable Curve Control Handle */}
          <g
            className="cursor-move transition-transform active:scale-125"
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelectedConnectorId(conn.id);
              setIsDraggingControl(conn.id);
            }}
          >
            <circle
              cx={midX}
              cy={midY}
              r={isSelected ? "9" : "6"}
              fill={isSelected ? "#fbbf24" : strokeColor}
              stroke="#0F0F11"
              strokeWidth="2"
              className="transition-all hover:scale-125 drop-shadow-md"
            />
          </g>

          {/* Connector Label Pill */}
          {conn.label && (
            <g transform={`translate(${midX}, ${midY - 14})`}>
              <rect
                x="-55"
                y="-10"
                width="110"
                height="18"
                rx="4"
                fill="#0F0F11"
                stroke={isSelected ? "#fbbf24" : strokeColor}
                strokeWidth={isSelected ? "1.5" : "1"}
                opacity="0.95"
              />
              <text
                x="0"
                y="3"
                fill="#E4E4E7"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {conn.label}
              </text>
            </g>
          )}

          {/* Floating Action Menu for Selected Connector */}
          {isSelected && (
            <foreignObject
              x={midX - 110}
              y={midY - 56}
              width="220"
              height="40"
              className="overflow-visible pointer-events-auto"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 bg-[#151517] border border-amber-500/60 shadow-2xl rounded-lg p-1 text-[10px] font-sans"
              >
                <select
                  value={conn.type}
                  onChange={(e) => updateConnector(conn.id, { type: e.target.value as any })}
                  className="bg-[#18181B] text-white px-1.5 py-0.5 rounded border border-[#2A2A2E] text-[10px] font-mono outline-none"
                >
                  <option value="direct_access">🟢 Direct</option>
                  <option value="visual_link">🔵 Visual</option>
                  <option value="service_link">🟡 Service</option>
                  <option value="acoustic_conflict">🔴 Acoustic</option>
                </select>

                <input
                  type="text"
                  placeholder="Label..."
                  value={conn.label || ""}
                  onChange={(e) => updateConnector(conn.id, { label: e.target.value })}
                  className="bg-[#18181B] text-white px-1.5 py-0.5 rounded border border-[#2A2A2E] text-[10px] w-16 outline-none font-mono"
                />

                {conn.controlOffset && (
                  <button
                    onClick={() => updateConnector(conn.id, { controlOffset: undefined })}
                    title="Straighten line"
                    className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[9px]"
                  >
                    Reset
                  </button>
                )}

                <button
                  onClick={() => removeConnector(conn.id)}
                  title="Delete connection"
                  className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </foreignObject>
          )}
        </g>
      );
    });
  };

  // Render Architectural Dimension Strings
  const renderDimensions = () => {
    return boardDimensions.map((dim) => {
      const dx = dim.x2 - dim.x1;
      const dy = dim.y2 - dim.y1;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const midX = (dim.x1 + dim.x2) / 2;
      const midY = (dim.y1 + dim.y2) / 2;

      let badgeColor = "bg-neutral-900 border-neutral-700 text-neutral-300";
      if (dim.clearanceStatus === "non_compliant") {
        badgeColor = "bg-red-950/90 border-red-500 text-red-300";
      } else if (dim.clearanceStatus === "tight") {
        badgeColor = "bg-amber-950/90 border-amber-500 text-amber-300";
      } else {
        badgeColor = "bg-[#18181B]/95 border-emerald-500/50 text-emerald-400";
      }

      return (
        <g key={dim.id} className="pointer-events-auto group cursor-pointer">
          {/* Main Dimension Line */}
          <line
            x1={dim.x1}
            y1={dim.y1}
            x2={dim.x2}
            y2={dim.y2}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4,2"
          />
          {/* Start and End 45-degree Architectural Tick Marks */}
          <line
            x1={dim.x1 - 6}
            y1={dim.y1 - 6}
            x2={dim.x1 + 6}
            y2={dim.y1 + 6}
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <line
            x1={dim.x2 - 6}
            y1={dim.y2 - 6}
            x2={dim.x2 + 6}
            y2={dim.y2 + 6}
            stroke="#f59e0b"
            strokeWidth="2.5"
          />

          {/* Dimension Metric Pill Label */}
          <foreignObject
            x={midX - 45}
            y={midY - 14}
            width="90"
            height="28"
            className="overflow-visible"
          >
            <div
              className={`flex items-center justify-between px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold shadow-md ${badgeColor}`}
            >
              <div className="flex items-center gap-1">
                <Ruler className="w-2.5 h-2.5 opacity-70" />
                <span>{dim.distanceM}m</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDimension(dim.id);
                }}
                className="hover:text-red-400 text-neutral-400 transition-colors ml-1"
                title="Remove dimension"
              >
                ×
              </button>
            </div>
          </foreignObject>
        </g>
      );
    });
  };

  // Render Section Cut Lines (Section A-A, B-B with cutting plane indicators)
  const renderSectionCuts = () => {
    return boardSectionCuts.map((cut) => {
      const midX = (cut.x1 + cut.x2) / 2;
      const midY = (cut.y1 + cut.y2) / 2;

      return (
        <g
          key={cut.id}
          className="pointer-events-auto group cursor-pointer"
          onClick={() => setActiveModal("building_section")}
        >
          {/* Long-dash dot Architectural Section Line */}
          <line
            x1={cut.x1}
            y1={cut.y1}
            x2={cut.x2}
            y2={cut.y2}
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="14,4,4,4"
          />
          {/* Section Cut Heads (Circles with cut letters) */}
          <circle cx={cut.x1} cy={cut.y1} r="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
          <text
            x={cut.x1}
            y={cut.y1 + 3.5}
            fill="#ffffff"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {cut.label.split(" ")[1]?.charAt(0) || "A"}
          </text>

          <circle cx={cut.x2} cy={cut.y2} r="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
          <text
            x={cut.x2}
            y={cut.y2 + 3.5}
            fill="#ffffff"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {cut.label.split(" ")[1]?.charAt(0) || "A"}
          </text>

          {/* Section Callout Label */}
          <g transform={`translate(${midX}, ${midY - 14})`}>
            <rect
              x="-45"
              y="-10"
              width="90"
              height="20"
              rx="4"
              fill="#082f49"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="4"
              fill="#e0f2fe"
              fontSize="9"
              fontWeight="bold"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {cut.label} (Cut)
            </text>
          </g>
        </g>
      );
    });
  };

  // Render Elements
  const renderElementCard = (element: CanvasElement) => {
    const isSelected = selectedElementIds.includes(element.id);
    const isHoveredCol = element.id === hoveredColumnId;

    return (
      <div
        key={element.id}
        onPointerDown={(e) => startElementDrag(e, element)}
        className={`absolute transition-shadow ${
          isHoveredCol ? "ring-4 ring-sky-400/50 scale-[1.01]" : ""
        }`}
        style={{
          transform: `translate3d(${element.x}px, ${element.y}px, 0)`,
          zIndex: isSelected ? 50 : element.zIndex || 1,
          touchAction: "none",
        }}
      >
        {element.type === "level_column" && (
          <LevelColumnCard element={element as LevelColumnElement} isSelected={isSelected} />
        )}
        {element.type === "room_bubble" && (
          <RoomBubbleCard element={element as RoomElement} isSelected={isSelected} />
        )}
        {element.type === "precedent_card" && (
          <PrecedentCard element={element as any} isSelected={isSelected} />
        )}
        {element.type === "solar_compass" && (
          <SolarCompassCard element={element as any} isSelected={isSelected} />
        )}
        {element.type === "note_card" && (
          <NoteCard element={element as any} isSelected={isSelected} />
        )}
        {element.type === "media_card" && (
          <MediaCard element={element as any} isSelected={isSelected} />
        )}
        {element.type === "trace_layer" && (
          <TracePaperCard element={element as any} isSelected={isSelected} />
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMoveWrapper}
      onPointerUp={onPointerUpWrapper}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: "none", userSelect: "none" }}
      className={`relative w-full h-full overflow-hidden bg-[#0F0F11] select-none ${
        activeTool === "pan" || isPanning
          ? "cursor-grab active:cursor-grabbing"
          : activeTool === "dimension_ruler" || activeTool === "section_cut" || Boolean(connectingSourceId)
          ? "cursor-crosshair"
          : "cursor-default"
      }`}
    >
      {/* Dynamic Grid Background Surface */}
      <svg
        id="canvas-plane"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <defs>
          {/* 1-meter Metric Grid Pattern (40px base cell at 1:100 scale) */}
          <pattern
            id="metric-grid-small"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <path
              d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
              fill="none"
              stroke="#1C1C20"
              strokeWidth="0.5"
            />
          </pattern>

          {/* 5-meter Major Metric Grid Line */}
          <pattern
            id="metric-grid-large"
            width={200 * zoom}
            height={200 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <rect width={200 * zoom} height={200 * zoom} fill="url(#metric-grid-small)" />
            <path
              d={`M ${200 * zoom} 0 L 0 0 0 ${200 * zoom}`}
              fill="none"
              stroke="#2D2D34"
              strokeWidth="1.2"
            />
          </pattern>

          {/* Dot Grid Pattern */}
          <pattern
            id="dot-grid"
            width={30 * zoom}
            height={30 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <circle cx="2" cy="2" r={Math.max(1, 1.2 * zoom)} fill="#2D2D34" />
          </pattern>
        </defs>

        {gridMode === "metric" && <rect width="100%" height="100%" fill="url(#metric-grid-large)" />}
        {gridMode === "dot" && <rect width="100%" height="100%" fill="url(#dot-grid)" />}
      </svg>

      {/* Transform Container (Canvas Content Layer) */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          zIndex: 1,
        }}
      >
        {/* SVG Connector & Dimension & Section Cut Layer */}
        <svg
          className="absolute inset-0 w-[20000px] h-[20000px] pointer-events-none"
          style={{ overflow: "visible", zIndex: 5 }}
        >
          {renderConnectors()}
          {renderDimensions()}
          {renderSectionCuts()}

          {/* Live drafting connector line from source bubble to mouse position */}
          {connectingSourceId && (() => {
            const srcEl = boardElements.find((e) => e.id === connectingSourceId);
            if (!srcEl) return null;
            const sx = srcEl.x + srcEl.width / 2;
            const sy = srcEl.y + srcEl.height / 2;
            const tx = mouseWorldPos.x;
            const ty = mouseWorldPos.y;
            return (
              <g>
                <line
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  className="animate-pulse"
                />
                <circle cx={sx} cy={sy} r="6" fill="#fbbf24" />
                <circle cx={tx} cy={ty} r="7" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
              </g>
            );
          })()}

          {/* Active Drafting line preview when clicking first point of dimension / section */}
          {draftStartPoint && (
            <circle
              cx={draftStartPoint.x}
              cy={draftStartPoint.y}
              r="6"
              fill="#f59e0b"
              className="animate-ping opacity-75"
            />
          )}
        </svg>

        {/* Canvas Elements (Cards, Columns, Rooms, Tools) */}
        <div className="absolute inset-0 pointer-events-auto">
          {boardElements.map(renderElementCard)}
        </div>

        {/* Marquee Selection Rectangle */}
        {isMarquee && (
          <div
            className="absolute border border-amber-400 bg-amber-500/10 pointer-events-none rounded"
            style={{
              left: `${Math.min(marqueeStart.x, marqueeEnd.x)}px`,
              top: `${Math.min(marqueeStart.y, marqueeEnd.y)}px`,
              width: `${Math.abs(marqueeEnd.x - marqueeStart.x)}px`,
              height: `${Math.abs(marqueeEnd.y - marqueeStart.y)}px`,
              zIndex: 999,
            }}
          />
        )}
      </div>

      {/* Floating Spatial Action HUD Bar (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-[#151517]/90 backdrop-blur-md rounded-xl border border-[#2A2A2E] shadow-2xl z-20 pointer-events-auto">
        <button
          onClick={autoClusterLayout}
          title="Auto-Cluster Program by Functional Adjacency"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all shadow-sm active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Auto-Cluster</span>
        </button>

        <div className="w-[1px] h-4 bg-[#2A2A2E] mx-0.5" />

        <button
          onClick={() => setActiveModal("3d_massing")}
          title="2.5D / 3D Axonometric Massing Viewer"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E4E4E7] hover:text-white bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] rounded-lg transition-all active:scale-95"
        >
          <Box className="w-3.5 h-3.5 text-sky-400" />
          <span>3D Massing</span>
        </button>

        <button
          onClick={() => setActiveModal("adjacency_matrix")}
          title="Live Architectural Adjacency Matrix"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E4E4E7] hover:text-white bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] rounded-lg transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adjacency Matrix</span>
        </button>

        <button
          onClick={() => setActiveModal("building_section")}
          title="Parametric Building Section & Elevation Generator"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E4E4E7] hover:text-white bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] rounded-lg transition-all active:scale-95"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 text-indigo-400" />
          <span>Building Section</span>
        </button>

        <button
          onClick={() => setActiveModal("wind_rose")}
          title="Wind Rose & Passive Microclimate Simulation"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E4E4E7] hover:text-white bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] rounded-lg transition-all active:scale-95"
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span>Wind & Climate</span>
        </button>

        <button
          onClick={() => setActiveModal("presentation_pinup")}
          title="Studio Pin-Up / Presentation Mode"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E4E4E7] hover:text-white bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] rounded-lg transition-all active:scale-95"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Pin-Up Mode</span>
        </button>
      </div>

      {/* Floating Active Dimension / Tool Instruction Banner */}
      {(activeTool === "dimension_ruler" || activeTool === "section_cut" || Boolean(connectingSourceId)) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-amber-500 text-neutral-950 rounded-full font-mono text-xs font-bold shadow-2xl z-30 animate-bounce">
          {connectingSourceId ? (
            <Share2 className="w-4 h-4" />
          ) : (
            <Ruler className="w-4 h-4" />
          )}
          <span>
            {connectingSourceId
              ? "Click target space or port to complete connection"
              : activeTool === "dimension_ruler"
              ? draftStartPoint
                ? "Click second point to place dimension string"
                : "Click first point on canvas to measure distance"
              : draftStartPoint
              ? "Click second point to cut architectural section"
              : "Click first point to define section cutting plane"}
          </span>
          <button
            onClick={() => {
              setDraftStartPoint(null);
              setConnectingSourceId(null);
              setActiveTool("select");
            }}
            className="ml-2 bg-neutral-950/20 hover:bg-neutral-950/40 text-neutral-950 px-2 py-0.5 rounded text-[10px] uppercase font-bold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mini-Map Viewport Navigator (Bottom Right) */}
      <div className="absolute bottom-10 right-4 w-44 h-28 bg-[#151517]/90 backdrop-blur-md rounded-lg border border-[#2A2A2E] p-1.5 shadow-2xl z-20 pointer-events-auto hidden sm:block">
        <div className="text-[9px] font-mono text-[#A1A1AA] uppercase font-semibold flex justify-between px-1 mb-1">
          <span>Studio MiniMap</span>
          <span>{boardElements.length} Items</span>
        </div>
        <div className="relative w-full h-20 bg-[#0F0F11] rounded border border-[#2A2A2E] overflow-hidden">
          {boardElements.map((el) => (
            <div
              key={el.id}
              className={`absolute rounded-sm ${
                el.type === "level_column"
                  ? "bg-sky-500/30 border border-sky-500/50"
                  : el.type === "room_bubble"
                  ? "bg-emerald-500/60"
                  : "bg-amber-500/40"
              }`}
              style={{
                left: `${Math.max(0, Math.min(140, (el.x / 2500) * 140))}px`,
                top: `${Math.max(0, Math.min(70, (el.y / 2000) * 70))}px`,
                width: `${Math.max(4, (el.width / 2500) * 140)}px`,
                height: `${Math.max(3, (el.height / 2000) * 70)}px`,
              }}
            />
          ))}

          {/* Viewport Box */}
          <div
            className="absolute border border-amber-400 bg-amber-400/10 pointer-events-none rounded-sm"
            style={{
              left: `${Math.max(0, Math.min(120, (-pan.x / 2500 / zoom) * 140))}px`,
              top: `${Math.max(0, Math.min(50, (-pan.y / 2000 / zoom) * 70))}px`,
              width: `${Math.max(16, (800 / 2500 / zoom) * 140)}px`,
              height: `${Math.max(12, (500 / 2000 / zoom) * 70)}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
