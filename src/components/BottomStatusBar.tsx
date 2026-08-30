import React from "react";
import {
  Grid,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize,
  HardDrive,
  CheckCircle,
  Activity,
  Layers,
} from "lucide-react";
import { useStudio } from "../context/StudioContext";
import { GridMode } from "../types";

export const BottomStatusBar: React.FC = () => {
  const {
    gridMode,
    setGridMode,
    snapToGrid,
    setSnapToGrid,
    gridSnapM,
    setGridSnapM,
    boardElements,
    activeBoard,
    project,
    updateBoardViewport,
  } = useStudio();

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.min(2.5, Math.max(0.2, (activeBoard.zoom || 1) + delta));
    updateBoardViewport(activeBoard.id, activeBoard.pan || { x: 0, y: 0 }, newZoom);
  };

  const handleResetZoom = () => {
    updateBoardViewport(activeBoard.id, { x: 0, y: 0 }, 1);
  };

  return (
    <footer className="h-9 bg-[#151517]/90 backdrop-blur-md border-t border-[#2A2A2E] text-[#A1A1AA] flex items-center justify-between px-3 z-20 select-none text-[11px] font-mono">
      {/* Left: Offline Status & Storage Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>100% Offline-First</span>
        </div>

        <span className="text-[#2A2A2E]">|</span>

        <div className="flex items-center gap-1 text-[#A1A1AA]">
          <HardDrive className="w-3 h-3 text-[#71717A]" />
          <span>IndexedDB Synced</span>
        </div>

        <span className="text-[#2A2A2E] hidden sm:inline">|</span>

        <div className="hidden sm:flex items-center gap-1 text-[#A1A1AA]">
          <Layers className="w-3 h-3 text-[#71717A]" />
          <span>{boardElements.length} Board Items</span>
        </div>
      </div>

      {/* Center: Grid Controls (Metric Grid / Dot / Snap) */}
      <div className="flex items-center gap-2">
        {/* Grid Mode toggle */}
        <div className="flex items-center bg-[#0F0F11] px-1.5 py-0.5 rounded border border-[#2A2A2E] gap-1">
          <Grid className="w-3 h-3 text-[#A1A1AA]" />
          <button
            onClick={() => setGridMode("metric")}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              gridMode === "metric" ? "bg-[#222226] text-amber-300 font-bold" : "hover:text-[#E4E4E7]"
            }`}
          >
            Metric (1m)
          </button>
          <button
            onClick={() => setGridMode("dot")}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              gridMode === "dot" ? "bg-[#222226] text-amber-300 font-bold" : "hover:text-[#E4E4E7]"
            }`}
          >
            Dot
          </button>
          <button
            onClick={() => setGridMode("none")}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              gridMode === "none" ? "bg-[#222226] text-amber-300 font-bold" : "hover:text-[#E4E4E7]"
            }`}
          >
            Off
          </button>
        </div>

        {/* Snap to Grid toggle */}
        <div className="flex items-center bg-[#0F0F11] px-1.5 py-0.5 rounded border border-[#2A2A2E] gap-1">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Toggle Snap to Grid (S)"
            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] ${
              snapToGrid ? "text-amber-400 font-bold" : "text-[#71717A] hover:text-[#E4E4E7]"
            }`}
          >
            <Magnet className="w-3 h-3" />
            <span>Snap</span>
          </button>

          {snapToGrid && (
            <select
              value={gridSnapM}
              onChange={(e) => setGridSnapM(Number(e.target.value))}
              className="bg-transparent text-[10px] text-[#E4E4E7] outline-none cursor-pointer"
            >
              <option value="0.5" className="bg-[#151517] text-white">0.5m</option>
              <option value="1.0" className="bg-[#151517] text-white">1.0m</option>
              <option value="2.0" className="bg-[#151517] text-white">2.0m</option>
              <option value="5.0" className="bg-[#151517] text-white">5.0m</option>
            </select>
          )}
        </div>
      </div>

      {/* Right: Zoom Level & Reset */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleZoomChange(-0.15)}
          title="Zoom Out"
          className="p-1 text-[#A1A1AA] hover:text-white rounded hover:bg-[#222226]"
        >
          <ZoomOut className="w-3 h-3" />
        </button>

        <button
          onClick={handleResetZoom}
          title="Reset Zoom to 100%"
          className="px-1.5 py-0.5 text-[#E4E4E7] hover:text-white rounded hover:bg-[#222226] text-[10px] font-bold"
        >
          {Math.round((activeBoard.zoom || 1) * 100)}%
        </button>

        <button
          onClick={() => handleZoomChange(0.15)}
          title="Zoom In"
          className="p-1 text-[#A1A1AA] hover:text-white rounded hover:bg-[#222226]"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};
