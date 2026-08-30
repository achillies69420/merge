import React, { useState } from "react";
import { useStudio } from "../../context/StudioContext";
import { RoomElement, LevelColumnElement } from "../../types";
import {
  SplitSquareVertical,
  Sun,
  X,
  Download,
  Layers,
  ArrowUp,
  Ruler,
  Maximize2,
} from "lucide-react";

export const BuildingSectionModal: React.FC = () => {
  const { activeModal, setActiveModal, boardElements, boardSectionCuts, project } = useStudio();

  const [activeSectionId, setActiveSectionId] = useState<string>(
    boardSectionCuts?.[0]?.id || "default-sec"
  );
  const [showSolarAngles, setShowSolarAngles] = useState<boolean>(true);
  const [solarAngleDeg, setSolarAngleDeg] = useState<number>(42); // 42° mid-day sun
  const [slabThicknessM, setSlabThicknessM] = useState<number>(0.3); // 300mm concrete slab

  if (activeModal !== "building_section") return null;

  const columns = boardElements.filter(
    (el): el is LevelColumnElement => el.type === "level_column"
  );
  const rooms = boardElements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );

  const levels =
    columns.length > 0
      ? columns.sort((a, b) => (a.levelIndex ?? 0) - (b.levelIndex ?? 0))
      : [
          { id: "col-1", title: "Ground Floor", levelIndex: 0, elevationM: 0, floorHeightM: 3.8, targetGrossAreaM2: 240 } as any,
          { id: "col-2", title: "Level 1 Studio", levelIndex: 1, elevationM: 3.8, floorHeightM: 3.6, targetGrossAreaM2: 220 } as any,
          { id: "col-3", title: "Roof Terrace", levelIndex: 2, elevationM: 7.4, floorHeightM: 3.2, targetGrossAreaM2: 150 } as any,
        ];

  const totalHeightM = levels.reduce((sum, l) => sum + (l.floorHeightM || 3.5), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0F0F11] border border-[#2A2A2E] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2E] bg-[#151517]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <SplitSquareVertical className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E4E4E7] flex items-center gap-2">
                <span>Parametric Building Section & Elevation Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  Scale 1:100 Metric
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Vertical datum cuts, floor-to-floor clearances, and passive daylight penetration angles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal("none")}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2E] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Main Viewport & Controls */}
        <div className="flex-1 flex overflow-hidden">
          {/* SVG Section Cut Rendering Canvas */}
          <div className="flex-1 bg-[#09090b] relative flex items-center justify-center p-4 overflow-hidden">
            <svg
              className="w-full h-full"
              viewBox="0 0 850 550"
            >
              <defs>
                <pattern id="soil-hatch" width="16" height="16" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="16" x2="16" y2="0" stroke="#27272a" strokeWidth="1" />
                  <line x1="-4" y1="4" x2="4" y2="-4" stroke="#27272a" strokeWidth="1" />
                </pattern>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#09090b" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Sky Backdrop */}
              <rect x="50" y="30" width="750" height="390" fill="url(#skyGrad)" />

              {/* Ground & Soil Cross Section Hatch */}
              <rect x="50" y="420" width="750" height="100" fill="url(#soil-hatch)" />
              <line x1="50" y1="420" x2="800" y2="420" stroke="#52525b" strokeWidth="3" />

              {/* +0.00 Ground Datum Marker */}
              <g transform="translate(70, 420)">
                <polygon points="0,0 -8,-14 8,-14" fill="#a1a1aa" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#a1a1aa" strokeWidth="1" />
                <text x="25" y="4" fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  ±0.00m Ground Level
                </text>
              </g>

              {/* Daylight Penetration Vector Rays */}
              {showSolarAngles && (
                <g opacity="0.6">
                  {/* Sun ray 1 */}
                  <line
                    x1="180"
                    y1="50"
                    x2={180 + Math.cos((solarAngleDeg * Math.PI) / 180) * 400}
                    y2={50 + Math.sin((solarAngleDeg * Math.PI) / 180) * 400}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                  />
                  {/* Sun ray 2 */}
                  <line
                    x1="320"
                    y1="50"
                    x2={320 + Math.cos((solarAngleDeg * Math.PI) / 180) * 400}
                    y2={50 + Math.sin((solarAngleDeg * Math.PI) / 180) * 400}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                  />
                  <text
                    x="200"
                    y="70"
                    fill="#fbbf24"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    Daylight Angle: {solarAngleDeg}°
                  </text>
                </g>
              )}

              {/* Render Architectural Floor Slabs & Levels */}
              {(() => {
                let currentY = 420;
                return levels.map((lvl, idx) => {
                  const floorH = (lvl.floorHeightM || 3.5) * 28; // 28px per meter
                  const slabH = slabThicknessM * 28;
                  const floorTop = currentY - floorH;
                  const lvlRooms = rooms.filter((r) => r.parentColumnId === lvl.id);
                  currentY = floorTop;

                  return (
                    <g key={lvl.id}>
                      {/* Floor Concrete Slab */}
                      <rect
                        x="200"
                        y={floorTop}
                        width="450"
                        height={slabH}
                        fill="#3f3f46"
                        stroke="#71717a"
                        strokeWidth="1"
                      />

                      {/* Floor Level Datum Marker on Right */}
                      <g transform={`translate(670, ${floorTop})`}>
                        <line x1="0" y1="0" x2="80" y2="0" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,2" />
                        <polygon points="0,0 8,-8 8,8" fill="#38bdf8" />
                        <text x="14" y="3" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          +{((lvl.elevationM || idx * 3.6) + (lvl.floorHeightM || 3.5)).toFixed(2)}m
                        </text>
                        <text x="14" y="15" fill="#a1a1aa" fontSize="8" fontFamily="sans-serif">
                          {lvl.title}
                        </text>
                      </g>

                      {/* Room Spatial Compartments on this level */}
                      {lvlRooms.length > 0 ? (
                        lvlRooms.map((room, rIdx) => {
                          const roomW = 450 / Math.max(1, lvlRooms.length);
                          const roomX = 200 + rIdx * roomW;
                          const roomH = floorH - slabH;

                          let fillCol = "#0284c7";
                          if (room.category === "public") fillCol = "#0284c7";
                          else if (room.category === "private") fillCol = "#8b5cf6";
                          else if (room.category === "circulation") fillCol = "#f59e0b";
                          else if (room.category === "service") fillCol = "#64748b";

                          return (
                            <g key={room.id}>
                              {/* Room Section Volume */}
                              <rect
                                x={roomX + 5}
                                y={floorTop + slabH}
                                width={roomW - 10}
                                height={roomH}
                                fill={fillCol}
                                fillOpacity="0.25"
                                stroke={fillCol}
                                strokeWidth="1.5"
                                rx="3"
                              />

                              {/* Room Details & Dimensions */}
                              <text
                                x={roomX + roomW / 2}
                                y={floorTop + slabH + roomH / 2 - 4}
                                fill="#ffffff"
                                fontSize="11"
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="sans-serif"
                              >
                                {room.name}
                              </text>
                              <text
                                x={roomX + roomW / 2}
                                y={floorTop + slabH + roomH / 2 + 10}
                                fill="#a1a1aa"
                                fontSize="9"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {room.targetAreaM2}m² (H: {(lvl.floorHeightM || 3.5).toFixed(1)}m)
                              </text>
                            </g>
                          );
                        })
                      ) : (
                        <rect
                          x="205"
                          y={floorTop + slabH}
                          width="440"
                          height={floorH - slabH}
                          fill="#18181b"
                          fillOpacity="0.5"
                          stroke="#27272a"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                      )}
                    </g>
                  );
                });
              })()}

              {/* Dimension Height Line on Left */}
              <g transform="translate(160, 0)">
                <line x1="0" y1="420" x2="0" y2={420 - totalHeightM * 28} stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="-5" y1="420" x2="5" y2="420" stroke="#f59e0b" strokeWidth="2" />
                <line x1="-5" y1={420 - totalHeightM * 28} x2="5" y2={420 - totalHeightM * 28} stroke="#f59e0b" strokeWidth="2" />
                <text
                  x="-12"
                  y={420 - (totalHeightM * 28) / 2}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  transform={`rotate(-90, -12, ${420 - (totalHeightM * 28) / 2})`}
                  textAnchor="middle"
                >
                  Total Height {totalHeightM.toFixed(2)}m
                </text>
              </g>
            </svg>
          </div>

          {/* Right Parameters Sidebar */}
          <div className="w-80 bg-[#151517] border-l border-[#2A2A2E] p-5 flex flex-col gap-5 overflow-y-auto">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider mb-3">
                Section Parameters
              </h3>

              {/* Sun Angle Slider */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-[#E4E4E7]">
                  <span>Daylight Solar Altitude</span>
                  <span className="font-mono text-amber-400">{solarAngleDeg}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="75"
                  value={solarAngleDeg}
                  onChange={(e) => setSolarAngleDeg(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#222226] rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Concrete Slab Thickness */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-[#E4E4E7]">
                  <span>Structural Slab Thickness</span>
                  <span className="font-mono text-indigo-400">{Math.round(slabThicknessM * 1000)}mm</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.6"
                  step="0.05"
                  value={slabThicknessM}
                  onChange={(e) => setSlabThicknessM(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#222226] rounded accent-indigo-500 cursor-pointer"
                />
              </div>

              <label className="flex items-center justify-between text-xs text-[#E4E4E7] py-2 border-t border-[#2A2A2E] cursor-pointer">
                <span>Show Solar Penetration Rays</span>
                <input
                  type="checkbox"
                  checked={showSolarAngles}
                  onChange={(e) => setShowSolarAngles(e.target.checked)}
                  className="rounded border-[#2A2A2E] text-indigo-500 focus:ring-0"
                />
              </label>
            </div>

            {/* Level Stacking Breakdown */}
            <div className="border-t border-[#2A2A2E] pt-4 space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider mb-2">
                Floor Heights Breakdown
              </h3>
              {levels.map((lvl, idx) => (
                <div
                  key={lvl.id}
                  className="p-2.5 bg-[#18181B] border border-[#2A2A2E] rounded-lg text-xs flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-[#E4E4E7]">{lvl.title}</div>
                    <div className="text-[10px] text-[#A1A1AA]">
                      {rooms.filter((r) => r.parentColumnId === lvl.id).length} Assigned Spaces
                    </div>
                  </div>
                  <div className="font-mono text-indigo-400 font-bold">
                    {(lvl.floorHeightM || 3.5).toFixed(2)}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
