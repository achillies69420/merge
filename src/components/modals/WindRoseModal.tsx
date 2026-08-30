import React, { useState } from "react";
import { useStudio } from "../../context/StudioContext";
import { RoomElement } from "../../types";
import {
  Wind,
  Compass,
  X,
  Sun,
  ShieldCheck,
  Zap,
  TrendingUp,
  ThermometerSnowflake,
  Flame,
} from "lucide-react";

export const WindRoseModal: React.FC = () => {
  const { activeModal, setActiveModal, boardElements, project } = useStudio();

  const [season, setSeason] = useState<"summer" | "winter">("summer");
  const [prevailingAngleDeg, setPrevailingAngleDeg] = useState<number>(225); // Southwest summer wind
  const [avgSpeedMps, setAvgSpeedMps] = useState<number>(4.2); // 4.2 m/s

  if (activeModal !== "wind_rose") return null;

  const rooms = boardElements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );

  // Compute 16-point wind frequency vectors
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];

  // Natural cross-ventilation potential score
  const circulationRooms = rooms.filter((r) => r.category === "circulation");
  const crossVentScore = Math.min(
    95,
    Math.round(40 + circulationRooms.length * 15 + rooms.length * 3)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0F0F11] border border-[#2A2A2E] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2E] bg-[#151517]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <Wind className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E4E4E7] flex items-center gap-2">
                <span>Wind Rose & Passive Microclimate Simulation</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  Bioclimatic Analysis
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Meteorological wind frequency distribution, natural cross-ventilation, and passive cooling potential
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

        {/* Modal Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Polar Wind Rose Radar Graphic */}
          <div className="flex-1 bg-[#09090b] relative flex items-center justify-center p-6 overflow-hidden">
            <svg className="w-full h-full max-w-[520px] max-h-[520px]" viewBox="-250 -250 500 500">
              {/* Concentric frequency rings (5%, 10%, 15%, 20%) */}
              {[40, 80, 120, 160, 200].map((r, idx) => (
                <g key={r}>
                  <circle cx="0" cy="0" r={r} fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                  <text
                    x="4"
                    y={-r + 12}
                    fill="#71717a"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {(idx + 1) * 5}%
                  </text>
                </g>
              ))}

              {/* 16 Radial Axis Lines */}
              {directions.map((dir, i) => {
                const angleRad = ((i * 22.5 - 90) * Math.PI) / 180;
                const x2 = Math.cos(angleRad) * 215;
                const y2 = Math.sin(angleRad) * 215;
                const labelX = Math.cos(angleRad) * 235;
                const labelY = Math.sin(angleRad) * 235;

                return (
                  <g key={dir}>
                    <line x1="0" y1="0" x2={x2} y2={y2} stroke="#27272a" strokeWidth="0.8" />
                    <text
                      x={labelX}
                      y={labelY + 4}
                      fill={dir === "N" ? "#ef4444" : "#a1a1aa"}
                      fontSize={dir.length === 1 ? "12" : "9"}
                      fontWeight={dir.length === 1 ? "bold" : "normal"}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {dir}
                    </text>
                  </g>
                );
              })}

              {/* Wind Rose Petals / Speed Distribution */}
              {directions.map((dir, i) => {
                const angleDeg = i * 22.5;
                // Calculate simulated petal length based on prevailing direction
                const diff = Math.abs(angleDeg - prevailingAngleDeg);
                const normalizedDiff = Math.min(diff, 360 - diff);
                const factor = Math.max(0.15, Math.cos((normalizedDiff * Math.PI) / 180));
                const petalLen = factor * 190 * (avgSpeedMps / 5);

                const radMid = ((angleDeg - 90) * Math.PI) / 180;
                const radLeft = ((angleDeg - 90 - 7) * Math.PI) / 180;
                const radRight = ((angleDeg - 90 + 7) * Math.PI) / 180;

                const p1X = Math.cos(radLeft) * (petalLen * 0.4);
                const p1Y = Math.sin(radLeft) * (petalLen * 0.4);
                const p2X = Math.cos(radMid) * petalLen;
                const p2Y = Math.sin(radMid) * petalLen;
                const p3X = Math.cos(radRight) * (petalLen * 0.4);
                const p3Y = Math.sin(radRight) * (petalLen * 0.4);

                const isPrevailing = normalizedDiff < 30;

                return (
                  <polygon
                    key={`petal-${dir}`}
                    points={`0,0 ${p1X},${p1Y} ${p2X},${p2Y} ${p3X},${p3Y}`}
                    fill={
                      season === "summer"
                        ? isPrevailing ? "#06b6d4" : "#0284c7"
                        : isPrevailing ? "#3b82f6" : "#6366f1"
                    }
                    fillOpacity={isPrevailing ? 0.85 : 0.4}
                    stroke={isPrevailing ? "#67e8f9" : "none"}
                    strokeWidth="1"
                    className="transition-all duration-300 hover:fill-opacity-100 cursor-pointer"
                  />
                );
              })}

              {/* Center Compass Rose Hub */}
              <circle cx="0" cy="0" r="14" fill="#09090b" stroke="#06b6d4" strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill="#06b6d4" />
            </svg>
          </div>

          {/* Right Parameters & Climate Analysis */}
          <div className="w-80 bg-[#151517] border-l border-[#2A2A2E] p-5 flex flex-col gap-5 overflow-y-auto">
            {/* Season Selector */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider mb-3">
                Seasonal Microclimate
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSeason("summer");
                    setPrevailingAngleDeg(225); // SW Breeze
                    setAvgSpeedMps(4.2);
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    season === "summer"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-[#18181B] border-[#2A2A2E] text-[#A1A1AA]"
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Summer</span>
                </button>

                <button
                  onClick={() => {
                    setSeason("winter");
                    setPrevailingAngleDeg(45); // NE Chill
                    setAvgSpeedMps(6.8);
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    season === "winter"
                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                      : "bg-[#18181B] border-[#2A2A2E] text-[#A1A1AA]"
                  }`}
                >
                  <ThermometerSnowflake className="w-4 h-4 text-blue-400" />
                  <span>Winter</span>
                </button>
              </div>
            </div>

            {/* Prevailing Direction Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#E4E4E7]">
                <span>Prevailing Wind Direction</span>
                <span className="font-mono text-cyan-400">{prevailingAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={prevailingAngleDeg}
                onChange={(e) => setPrevailingAngleDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-[#222226] rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Average Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#E4E4E7]">
                <span>Average Velocity</span>
                <span className="font-mono text-cyan-400">{avgSpeedMps} m/s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="12.0"
                step="0.2"
                value={avgSpeedMps}
                onChange={(e) => setAvgSpeedMps(Number(e.target.value))}
                className="w-full h-1.5 bg-[#222226] rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Passive Bioclimatic Efficiency Score */}
            <div className="border-t border-[#2A2A2E] pt-4 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider">
                Passive Ventilation Rating
              </h3>

              <div className="p-3 bg-[#18181B] border border-[#2A2A2E] rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#A1A1AA]">Cross-Ventilation Efficiency:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {crossVentScore}%
                  </span>
                </div>
                <div className="w-full bg-[#222226] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all"
                    style={{ width: `${crossVentScore}%` }}
                  />
                </div>
              </div>

              {/* Architectural Recommendation Tips */}
              <div className="text-[11px] text-[#A1A1AA] space-y-1.5">
                <div className="flex items-start gap-1.5 text-cyan-300">
                  <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {season === "summer"
                      ? "Place operable windows on SW and NE facades to capture prevailing 4.2 m/s summer cooling breeze."
                      : "Buffer NE winter wind with service core or dense evergreen landscaping to reduce heat loss."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
