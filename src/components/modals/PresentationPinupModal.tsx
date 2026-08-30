import React, { useState } from "react";
import { useStudio } from "../../context/StudioContext";
import { RoomElement, LevelColumnElement, TraceLayerElement } from "../../types";
import {
  Maximize2,
  Minimize2,
  Printer,
  Compass,
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Award,
  PenTool,
  Grid,
} from "lucide-react";

export const PresentationPinupModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    project,
    boardElements,
    boardConnectors,
    metrics,
  } = useStudio();

  const [sheetSize, setSheetSize] = useState<"A1" | "A2" | "A3">("A1");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [paperTheme, setPaperTheme] = useState<"white_bond" | "canary_trace" | "blueprint">("white_bond");

  if (activeModal !== "presentation_pinup") return null;

  const rooms = boardElements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );
  const columns = boardElements.filter(
    (el): el is LevelColumnElement => el.type === "level_column"
  );
  const traceLayers = boardElements.filter(
    (el): el is TraceLayerElement => el.type === "trace_layer"
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0F0F11] text-[#E4E4E7] overflow-hidden">
      {/* Top Floating Presentation Control Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#151517] border-b border-[#2A2A2E] shadow-xl z-20 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Printer className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Architectural Sheet Pin-Up & Print Studio</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                {sheetSize} {orientation.toUpperCase()}
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              Standardized architectural drawing sheet with Title Block, Scale Bar, and Room Schedule
            </p>
          </div>
        </div>

        {/* Controls: Paper Theme, Sheet Size, Orientation, Print, Exit */}
        <div className="flex items-center gap-3">
          {/* Paper Theme */}
          <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#2A2A2E]">
            <button
              onClick={() => setPaperTheme("white_bond")}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                paperTheme === "white_bond"
                  ? "bg-white text-neutral-950 font-bold shadow"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              ⚪ White Bond
            </button>
            <button
              onClick={() => setPaperTheme("canary_trace")}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                paperTheme === "canary_trace"
                  ? "bg-amber-400 text-amber-950 font-bold shadow"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              🟡 Yellow Trace
            </button>
            <button
              onClick={() => setPaperTheme("blueprint")}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                paperTheme === "blueprint"
                  ? "bg-sky-500 text-neutral-950 font-bold shadow"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              🔵 Blueprint
            </button>
          </div>

          {/* Sheet Size */}
          <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#2A2A2E]">
            {(["A1", "A2", "A3"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setSheetSize(size)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  sheetSize === size
                    ? "bg-amber-500 text-neutral-950 shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#2A2A2E]">
            <button
              onClick={() => setOrientation("landscape")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                orientation === "landscape"
                  ? "bg-neutral-700 text-white font-bold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              Landscape
            </button>
            <button
              onClick={() => setOrientation("portrait")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                orientation === "portrait"
                  ? "bg-neutral-700 text-white font-bold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              Portrait
            </button>
          </div>

          {/* Print / Export Sheet */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet (PDF)</span>
          </button>

          {/* Close */}
          <button
            onClick={() => setActiveModal("none")}
            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2E] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Presentation Sheet Board Surface */}
      <div className="flex-1 bg-[#09090b] p-8 overflow-auto flex items-center justify-center print:p-0 print:bg-white print:overflow-visible">
        <div
          className={`printable-sheet border-2 shadow-2xl relative flex flex-col p-8 transition-all print:border-black print:shadow-none print:m-0 print:w-full print:h-full ${
            paperTheme === "white_bond"
              ? "bg-[#ffffff] text-neutral-900 border-neutral-400"
              : paperTheme === "canary_trace"
              ? "bg-[#fef3c7] text-amber-950 border-amber-400"
              : "bg-[#0c4a6e] text-white border-sky-400"
          } ${
            orientation === "landscape" ? "w-[1100px] h-[750px]" : "w-[750px] h-[1050px]"
          }`}
          style={{ boxSizing: "border-box" }}
        >
          {/* Outer Border Inset Margin Line */}
          <div
            className={`absolute inset-4 border pointer-events-none ${
              paperTheme === "white_bond"
                ? "border-neutral-400"
                : paperTheme === "canary_trace"
                ? "border-amber-400"
                : "border-sky-400/50"
            }`}
          />

          {/* Top Drawing Header Banner */}
          <div
            className={`flex items-start justify-between pb-4 border-b relative z-10 ${
              paperTheme === "white_bond"
                ? "border-neutral-300"
                : paperTheme === "canary_trace"
                ? "border-amber-400/60"
                : "border-sky-400/40"
            }`}
          >
            <div>
              <div
                className={`text-[11px] font-mono tracking-widest uppercase font-bold ${
                  paperTheme === "white_bond"
                    ? "text-neutral-600"
                    : paperTheme === "canary_trace"
                    ? "text-amber-800"
                    : "text-sky-300"
                }`}
              >
                {project.studioName || "ARCHITECTURAL DESIGN STUDIO"}
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase">
                {project.name}
              </h2>
              <div
                className={`text-xs mt-0.5 ${
                  paperTheme === "white_bond"
                    ? "text-neutral-500"
                    : paperTheme === "canary_trace"
                    ? "text-amber-800/80"
                    : "text-sky-200"
                }`}
              >
                Site: {project.siteLocation || "Urban Context"} | Typology: {project.typology || "Mixed-Use"} | Scale {project.scale}
              </div>
            </div>

            {/* True North Arrow Indicator */}
            <div className="flex flex-col items-center">
              <svg width="48" height="48" viewBox="-24 -24 48 48">
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  fill="none"
                  stroke={paperTheme === "blueprint" ? "#38bdf8" : "#18181b"}
                  strokeWidth="1.5"
                />
                <polygon points="0,-18 5,0 0,-4" fill="#dc2626" />
                <polygon
                  points="0,-18 -5,0 0,-4"
                  fill={paperTheme === "blueprint" ? "#38bdf8" : "#18181b"}
                />
                <polygon points="0,18 5,0 0,4" fill="#9ca3af" />
                <polygon points="0,18 -5,0 0,4" fill="#d1d5db" />
                <text
                  x="0"
                  y="-7"
                  fill="#dc2626"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  N
                </text>
              </svg>
              <span className="text-[9px] font-mono font-bold">TRUE NORTH</span>
            </div>
          </div>

          {/* Center Drawing Canvas Workspace */}
          <div className="flex-1 relative my-4 overflow-hidden flex flex-col justify-between">
            {/* Render spatial bubble diagram preview */}
            <div className="relative w-full flex-1 border border-dashed rounded-xl p-4 flex flex-wrap gap-4 items-center justify-center overflow-auto border-neutral-400/40">
              {rooms.length === 0 ? (
                <div className="text-center p-8 opacity-60 font-mono text-sm">
                  Place room bubbles or digital trace layers on the canvas to display on the sheet.
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-3 rounded-xl shadow-md min-w-[140px] max-w-[200px] border ${
                      paperTheme === "white_bond"
                        ? "bg-neutral-50 border-neutral-300 text-neutral-900"
                        : paperTheme === "canary_trace"
                        ? "bg-[#fef9c3] border-amber-300 text-amber-950"
                        : "bg-sky-900/60 border-sky-400/60 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          room.category === "public"
                            ? "bg-sky-500"
                            : room.category === "private"
                            ? "bg-purple-500"
                            : room.category === "circulation"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="font-bold text-xs truncate">{room.name}</span>
                    </div>
                    <div className="font-mono text-[10px] font-bold">
                      {room.targetAreaM2} m² ({(room.widthM || 6)}m × {(room.lengthM || 5)}m)
                    </div>
                    <div className="text-[9px] opacity-75 capitalize">
                      {room.category} • {room.daylightReq} daylight
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Trace Sketches Note */}
            {traceLayers.length > 0 && (
              <div className="text-[10px] font-mono mt-2 flex items-center gap-2 opacity-80">
                <PenTool className="w-3 h-3 text-amber-600" />
                <span>Includes {traceLayers.length} hand-drawn digital trace overlay layer(s).</span>
              </div>
            )}
          </div>

          {/* Bottom Right Architectural Title Block & Scale Bar */}
          <div
            className={`pt-4 border-t flex items-end justify-between relative z-10 ${
              paperTheme === "white_bond"
                ? "border-neutral-300"
                : paperTheme === "canary_trace"
                ? "border-amber-400/60"
                : "border-sky-400/40"
            }`}
          >
            {/* Scale Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center text-[10px] font-mono">
                <span className="w-12 text-left">0m</span>
                <span className="w-12 text-left">5m</span>
                <span className="w-12 text-left">10m</span>
                <span className="w-12 text-left">20m</span>
              </div>
              <div
                className={`flex h-2 w-48 border ${
                  paperTheme === "blueprint" ? "border-sky-300" : "border-neutral-900"
                }`}
              >
                <div className={paperTheme === "blueprint" ? "w-12 bg-white" : "w-12 bg-neutral-900"} />
                <div className={paperTheme === "blueprint" ? "w-12 bg-sky-900" : "w-12 bg-neutral-100"} />
                <div className={paperTheme === "blueprint" ? "w-12 bg-white" : "w-12 bg-neutral-900"} />
                <div className={paperTheme === "blueprint" ? "w-12 bg-sky-900" : "w-12 bg-neutral-100"} />
              </div>
              <div className="text-[9px] font-mono opacity-80 font-bold">
                ARCHITECTURAL SCALE: {project.scale}
              </div>
            </div>

            {/* Standard Title Block Grid */}
            <div
              className={`border text-xs divide-y w-96 ${
                paperTheme === "white_bond"
                  ? "bg-neutral-50 border-neutral-900 divide-neutral-900 text-neutral-900"
                  : paperTheme === "canary_trace"
                  ? "bg-[#fef9c3] border-amber-900 divide-amber-900 text-amber-950"
                  : "bg-sky-950 border-sky-400 divide-sky-400 text-white"
              }`}
            >
              <div className="grid grid-cols-2 divide-x divide-current p-1.5">
                <div>
                  <div className="text-[8px] font-mono uppercase opacity-75">Student / Author</div>
                  <div className="font-bold text-xs truncate">
                    {project.studentName || "Studio Architect"}
                  </div>
                </div>
                <div className="pl-2">
                  <div className="text-[8px] font-mono uppercase opacity-75">Total Net / GFA</div>
                  <div className="font-mono font-bold text-xs">
                    {metrics.totalNetAreaM2} m² / {metrics.totalGrossAreaM2} m²
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-current p-1.5 text-[10px] font-mono">
                <div>
                  <div className="text-[8px] opacity-75">SHEET</div>
                  <div className="font-bold">A-101</div>
                </div>
                <div className="pl-2">
                  <div className="text-[8px] opacity-75">DATE</div>
                  <div>{new Date().toLocaleDateString()}</div>
                </div>
                <div className="pl-2">
                  <div className="text-[8px] opacity-75">STATUS</div>
                  <div className="font-bold text-emerald-600">PIN-UP REVIEW</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
