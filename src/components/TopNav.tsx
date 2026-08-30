import React, { useState, useRef } from "react";
import {
  Compass,
  Layers,
  FileDown,
  FileUp,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Plus,
  Table,
  Image as ImageIcon,
  CheckCircle2,
  Settings2,
  Trash2,
  FolderKanban,
  Box,
  Mountain,
  FileSpreadsheet,
  SplitSquareVertical,
  Wind,
  Maximize2,
  Printer,
} from "lucide-react";
import { useStudio } from "../context/StudioContext";
import { ScaleRatio } from "../types";
import { exportAreaScheduleCSV, exportBoardSVG } from "../utils/exportUtils";

export const TopNav: React.FC = () => {
  const {
    project,
    setProject,
    subBoards,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    addSubBoard,
    removeSubBoard,
    renameSubBoard,
    metrics,
    spatialIssues,
    undo,
    redo,
    canUndo,
    canRedo,
    exportStudio,
    importStudio,
    resetToDemo,
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    setRightDrawerTab,
    elements,
    connectors,
    aiEngineMode,
    setScale,
    setActiveModal,
  } = useStudio();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorCount = spatialIssues.filter((i) => i.severity === "error").length;
  const warningCount = spatialIssues.filter((i) => i.severity === "warning").length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importStudio(file);
      setIsExportOpen(false);
    }
  };

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      addSubBoard(newBoardName.trim(), "program");
      setNewBoardName("");
      setIsBoardMenuOpen(false);
    }
  };

  return (
    <header className="h-14 bg-[#151517]/90 backdrop-blur-md border-b border-[#2A2A2E] text-[#E4E4E7] flex items-center justify-between px-3 z-30 select-none">
      {/* LEFT SECTION: Logo, Project Name, Sub-board Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* App Logo & Studio Brand */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#2A2A2E]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Compass className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-[#E4E4E7] uppercase font-mono">
              ArchiCanvas
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-sans leading-none">
              Spatial Studio
            </span>
          </div>
        </div>

        {/* Project Name Editor */}
        <div className="flex items-center">
          {isEditingProjectName ? (
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={() => {
                setIsEditingProjectName(false);
                if (projectNameInput.trim()) {
                  setProject({ name: projectNameInput.trim() });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingProjectName(false);
                  if (projectNameInput.trim()) {
                    setProject({ name: projectNameInput.trim() });
                  }
                }
              }}
              autoFocus
              className="bg-[#18181B] text-xs font-semibold px-2 py-1 rounded border border-amber-500/60 text-white outline-none w-56 font-sans"
            />
          ) : (
            <button
              onClick={() => {
                setProjectNameInput(project.name);
                setIsEditingProjectName(true);
              }}
              title="Click to rename project"
              className="text-xs font-semibold text-[#E4E4E7] hover:text-white px-2 py-1 rounded hover:bg-[#222226] transition-colors flex items-center gap-1.5 max-w-[200px] truncate"
            >
              <span className="truncate">{project.name}</span>
            </button>
          )}
        </div>

        <span className="text-[#52525B]">/</span>

        {/* Sub-Board Breadcrumb Navigator */}
        <div className="relative">
          <button
            onClick={() => setIsBoardMenuOpen(!isBoardMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181B] hover:bg-[#222226] text-[#E4E4E7] hover:text-white rounded-md text-xs font-medium border border-[#2A2A2E] transition-all shadow-sm"
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[140px] truncate">{activeBoard.name}</span>
            <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
          </button>

          {isBoardMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#151517] border border-[#2A2A2E] rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#A1A1AA] font-semibold tracking-wider flex items-center justify-between">
                <span>Studio Sub-Boards</span>
                <span>{subBoards.length} Boards</span>
              </div>
              <div className="max-h-56 overflow-y-auto py-1 divide-y divide-[#2A2A2E]/50">
                {subBoards.map((board) => (
                  <div
                    key={board.id}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#222226] group transition-colors ${
                      board.id === activeBoardId
                        ? "bg-amber-500/10 text-amber-300 font-medium"
                        : "text-[#E4E4E7]"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveBoardId(board.id);
                        setIsBoardMenuOpen(false);
                      }}
                      className="flex items-center gap-2 flex-1 text-left truncate"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-amber-400" />
                      <span className="truncate">{board.name}</span>
                    </button>
                    {subBoards.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSubBoard(board.id);
                        }}
                        title="Delete sub-board"
                        className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Sub-board inline form */}
              <div className="p-2 border-t border-[#2A2A2E] flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  placeholder="New sub-board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                  className="bg-[#0F0F11] text-xs px-2 py-1 rounded border border-[#2A2A2E] text-[#E4E4E7] outline-none flex-1 font-sans focus:border-amber-500"
                />
                <button
                  onClick={handleCreateBoard}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: Scale Selector, Studio Viewers & Real-Time Architectural Metrics HUD */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Studio Viewers & Analysis Tools */}
        <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-lg border border-[#2A2A2E]">
          <button
            onClick={() => setActiveModal("3d_massing")}
            title="Open 2.5D / 3D Axonometric Massing Viewer"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-sky-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <Box className="w-3.5 h-3.5 text-sky-400" />
            <span>3D Massing</span>
          </button>

          <button
            onClick={() => setActiveModal("terrain_analysis")}
            title="Open Site Topography, Slope & Cut/Fill Earthwork Analysis"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-emerald-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terrain</span>
          </button>

          <button
            onClick={() => setActiveModal("adjacency_matrix")}
            title="Open Architectural Adjacency Matrix"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-emerald-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Matrix</span>
          </button>

          <button
            onClick={() => setActiveModal("building_section")}
            title="Open Parametric Section & Elevation Generator"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-indigo-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-indigo-400" />
            <span>Section</span>
          </button>

          <button
            onClick={() => setActiveModal("wind_rose")}
            title="Open Wind Rose & Microclimate Simulation"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-cyan-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Wind Rose</span>
          </button>

          <button
            onClick={() => setActiveModal("presentation_pinup")}
            title="Open Studio Pin-Up & Sheet Exporter"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#E4E4E7] hover:text-amber-300 hover:bg-[#222226] rounded transition-colors font-medium"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Pin-Up</span>
          </button>

          <button
            onClick={() => setActiveModal("presentation_pinup")}
            title="Print Architectural Drawing Sheet (PDF)"
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 rounded transition-colors font-semibold"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Sheet</span>
          </button>
        </div>

        {/* Scale Ratio Selector */}
        <div className="flex items-center gap-1.5 bg-[#0F0F11]/90 px-2.5 py-1 rounded-md border border-[#2A2A2E]">
          <span className="text-[10px] font-mono text-[#A1A1AA] uppercase font-semibold">
            Scale:
          </span>
          <select
            value={project.scale}
            onChange={(e) => setScale(e.target.value as ScaleRatio)}
            className="bg-transparent text-xs font-mono font-semibold text-amber-400 outline-none cursor-pointer"
          >
            <option value="1:50" className="bg-[#151517] text-white">1:50 (Detail)</option>
            <option value="1:100" className="bg-[#151517] text-white">1:100 (Floor Plan)</option>
            <option value="1:200" className="bg-[#151517] text-white">1:200 (Massing)</option>
            <option value="1:500" className="bg-[#151517] text-white">1:500 (Site Master)</option>
            <option value="1:1000" className="bg-[#151517] text-white">1:1000 (Urban)</option>
          </select>
        </div>

        {/* Metrics Pill HUD */}
        <div className="flex items-center gap-2 bg-[#0F0F11]/90 px-3 py-1 rounded-lg border border-[#2A2A2E] shadow-inner">
          {/* GFA metric */}
          <div className="flex items-baseline gap-1 font-mono text-xs">
            <span className="text-[10px] text-[#A1A1AA] uppercase">GFA:</span>
            <span className="font-bold text-[#E4E4E7]">{metrics.totalGfaM2}</span>
            <span className="text-[10px] text-[#A1A1AA]">m²</span>
          </div>

          <div className="w-px h-3 bg-[#2A2A2E]" />

          {/* Ground Footprint CES */}
          <div className="flex items-baseline gap-1 font-mono text-xs">
            <span className="text-[10px] text-[#A1A1AA] uppercase">CES:</span>
            <span
              className={`font-bold ${
                metrics.cesStatus === "exceeded"
                  ? "text-red-400"
                  : metrics.cesStatus === "warning"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {metrics.cesPercent}%
            </span>
            <span className="text-[9px] text-[#A1A1AA]">
              / max {project.maxCESPercent}%
            </span>
          </div>

          <div className="w-px h-3 bg-[#2A2A2E]" />

          {/* Floor Area Ratio COS */}
          <div className="flex items-baseline gap-1 font-mono text-xs">
            <span className="text-[10px] text-[#A1A1AA] uppercase">COS:</span>
            <span
              className={`font-bold ${
                metrics.cosStatus === "exceeded"
                  ? "text-red-400"
                  : metrics.cosStatus === "warning"
                  ? "text-amber-400"
                  : "text-[#E4E4E7]"
              }`}
            >
              {metrics.cosRatio}
            </span>
            <span className="text-[9px] text-[#A1A1AA]">
              / {project.maxCOS}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Undo/Redo, Export Menu, AI / CAD Rules Button */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#18181B] rounded-md p-0.5 border border-[#2A2A2E]">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222226] transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222226] transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export & Import Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181B] hover:bg-[#222226] text-[#E4E4E7] hover:text-white rounded-md text-xs font-medium border border-[#2A2A2E] transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>Export & Share</span>
            <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#151517] border border-[#2A2A2E] rounded-lg shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-mono text-[#A1A1AA] uppercase font-semibold">
                Studio Workspace File
              </div>
              <button
                onClick={() => {
                  exportStudio();
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#222226] flex items-center gap-2 text-[#E4E4E7] hover:text-white"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Export .studio (JSON)</span>
              </button>
              <label className="w-full text-left px-3 py-1.5 hover:bg-[#222226] flex items-center gap-2 text-[#E4E4E7] hover:text-white cursor-pointer">
                <FileUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Import .studio File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".studio,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="my-1 border-t border-[#2A2A2E]" />
              <div className="px-3 py-1 text-[10px] font-mono text-[#A1A1AA] uppercase font-semibold">
                Architectural Schedules & Vector
              </div>

              <button
                onClick={() => {
                  exportAreaScheduleCSV(elements, project, metrics);
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#222226] flex items-center gap-2 text-[#E4E4E7] hover:text-white"
              >
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Area Schedule (CSV)</span>
              </button>

              <button
                onClick={() => {
                  exportBoardSVG(elements, connectors, project, activeBoard.name);
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#222226] flex items-center gap-2 text-[#E4E4E7] hover:text-white"
              >
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Export Vector Drawing (SVG)</span>
              </button>

              <div className="my-1 border-t border-[#2A2A2E]" />
              <button
                onClick={() => {
                  if (confirm("Reset current workspace to default demo project?")) {
                    resetToDemo();
                    setIsExportOpen(false);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-950/40 text-red-400 hover:text-red-300 flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Demo Dataset</span>
              </button>
            </div>
          )}
        </div>

        {/* AI & CAD Rules Inspector Trigger Button */}
        <button
          onClick={() => {
            setIsRightDrawerOpen(!isRightDrawerOpen);
            setRightDrawerTab("rules");
          }}
          className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
            isRightDrawerOpen
              ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20"
              : errorCount > 0
              ? "bg-red-950/80 text-red-300 border-red-800/80 hover:bg-red-900/80"
              : warningCount > 0
              ? "bg-amber-950/80 text-amber-300 border-amber-800/80 hover:bg-amber-900/80"
              : "bg-[#18181B] text-[#E4E4E7] border-[#2A2A2E] hover:bg-[#222226]"
          }`}
        >
          {errorCount > 0 || warningCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Studio Inspector</span>

          {(errorCount > 0 || warningCount > 0) && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                errorCount > 0 ? "bg-red-500 text-white" : "bg-amber-500 text-neutral-950"
              }`}
            >
              {errorCount + warningCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
