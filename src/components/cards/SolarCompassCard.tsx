import React, { useState } from "react";
import {
  Sun,
  Wind,
  Compass,
  Trash2,
  Clock,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import { SolarCompassElement } from "../../types";
import { useStudio } from "../../context/StudioContext";
import { calculateSolarPosition, getSolsticeDates } from "../../utils/solarMath";

interface SolarCompassCardProps {
  element: SolarCompassElement;
  isSelected: boolean;
}

export const SolarCompassCard: React.FC<SolarCompassCardProps> = ({ element, isSelected }) => {
  const { updateElement, removeElement } = useStudio();

  const [latitude, setLatitude] = useState(element.latitude);
  const [dayOfYear, setDayOfYear] = useState(element.dayOfYear);
  const [hourOfDay, setHourOfDay] = useState(element.hourOfDay);
  const [buildingHeight, setBuildingHeight] = useState(element.buildingHeightM);

  const solarData = calculateSolarPosition(latitude, dayOfYear, hourOfDay);
  const solstices = getSolsticeDates();

  const handleLatitudeChange = (val: number) => {
    setLatitude(val);
    updateElement(element.id, { latitude: val });
  };

  const handleDayChange = (val: number) => {
    setDayOfYear(val);
    updateElement(element.id, { dayOfYear: val });
  };

  const handleHourChange = (val: number) => {
    setHourOfDay(val);
    updateElement(element.id, { hourOfDay: val });
  };

  const handleHeightChange = (val: number) => {
    setBuildingHeight(val);
    updateElement(element.id, { buildingHeightM: val });
  };

  // Projected Shadow length = buildingHeight * shadowLengthRatio
  const projectedShadowM = Math.round(buildingHeight * solarData.shadowLengthRatio * 10) / 10;

  // Format hour to 24h string (e.g. 13:30)
  const hourInt = Math.floor(hourOfDay);
  const minInt = Math.round((hourOfDay - hourInt) * 60);
  const timeString = `${hourInt.toString().padStart(2, "0")}:${minInt.toString().padStart(2, "0")}`;

  // Compass Visual representation
  const compassRadius = 46;
  const cx = 55;
  const cy = 55;

  // Sun vector on compass (azimuth from North 0°)
  // Angle in math coords (0 = East, 90 = North) -> azRad = (90 - az) * PI/180
  const azRad = ((90 - solarData.azimuthDeg) * Math.PI) / 180;
  const sunX = cx + compassRadius * Math.cos(azRad);
  const sunY = cy - compassRadius * Math.sin(azRad);

  // Shadow vector throws in opposite direction of sun
  const shadowAzRad = ((90 - (solarData.azimuthDeg + 180)) * Math.PI) / 180;
  const shadowVisualLen = Math.min(compassRadius, Math.max(8, solarData.shadowLengthRatio * 10));
  const shadowX = cx + shadowVisualLen * Math.cos(shadowAzRad);
  const shadowY = cy - shadowVisualLen * Math.sin(shadowAzRad);

  return (
    <div
      className={`rounded-xl border backdrop-blur-md transition-all select-none p-3.5 shadow-2xl flex flex-col justify-between ${
        isSelected
          ? "border-amber-400 bg-[#151517]/95 ring-2 ring-amber-400/20"
          : "border-[#2A2A2E] bg-[#151517]/90 hover:border-[#3F3F46]"
      }`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Sun className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E4E4E7]">Bioclimatic Solar Compass</h3>
            <span className="text-[10px] font-mono text-[#A1A1AA]">NOAA/Spencer Math Engine</span>
          </div>
        </div>

        <button
          onClick={() => removeElement(element.id)}
          className="p-1 text-[#A1A1AA] hover:text-red-400 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Compass & Real-time Altitude/Azimuth display */}
      <div className="grid grid-cols-2 gap-3 items-center py-2">
        {/* SVG Compass Dial */}
        <div className="flex flex-col items-center justify-center">
          <svg width="110" height="110" className="overflow-visible">
            {/* Outer Compass Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={compassRadius}
              fill="#0F0F11"
              stroke="#2A2A2E"
              strokeWidth="1.5"
            />
            {/* Compass Axes */}
            <line x1={cx} y1={cy - compassRadius} x2={cx} y2={cy + compassRadius} stroke="#2A2A2E" strokeWidth="1" />
            <line x1={cx - compassRadius} y1={cy} x2={cx + compassRadius} y2={cy} stroke="#2A2A2E" strokeWidth="1" />

            {/* Cardinals */}
            <text x={cx} y={cy - compassRadius + 11} fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">N</text>
            <text x={cx + compassRadius - 8} y={cy + 3} fill="#71717A" fontSize="8" textAnchor="middle">E</text>
            <text x={cx} y={cy + compassRadius - 4} fill="#71717A" fontSize="8" textAnchor="middle">S</text>
            <text x={cx - compassRadius + 8} y={cy + 3} fill="#71717A" fontSize="8" textAnchor="middle">W</text>

            {/* Shadow Vector Projection (opposite to sun) */}
            {solarData.isDaylight && (
              <line
                x1={cx}
                y1={cy}
                x2={shadowX}
                y2={shadowY}
                stroke="#52525B"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="2,2"
              />
            )}

            {/* Center Building Mass */}
            <circle cx={cx} cy={cy} r="4" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />

            {/* Sun Vector Beam */}
            {solarData.isDaylight ? (
              <>
                <line x1={cx} y1={cy} x2={sunX} y2={sunY} stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx={sunX} cy={sunY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              </>
            ) : (
              <text x={cx} y={cy + 16} fill="#71717A" fontSize="7" textAnchor="middle">Night (Below Horizon)</text>
            )}
          </svg>
        </div>

        {/* Real-time Math Outputs */}
        <div className="space-y-1 text-xs font-mono bg-[#0F0F11]/80 p-2.5 rounded-lg border border-[#2A2A2E]">
          <div className="flex justify-between">
            <span className="text-[#A1A1AA]">Altitude (α):</span>
            <span className="font-bold text-amber-300">
              {solarData.isDaylight ? `${solarData.altitudeDeg}°` : "0° (Night)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A1A1AA]">Azimuth (γ):</span>
            <span className="font-bold text-sky-300">{solarData.azimuthDeg}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A1A1AA]">Shadow Length:</span>
            <span className="font-bold text-emerald-300">
              {solarData.isDaylight ? `${projectedShadowM} m` : "-"}
            </span>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-[#2A2A2E]">
            <span className="text-[#A1A1AA]">Bldg Height:</span>
            <span className="text-[#E4E4E7]">{buildingHeight}m</span>
          </div>
        </div>
      </div>

      {/* Sliders: Solstice Date, Hour of Day, Latitude */}
      <div className="space-y-2 pt-2 border-t border-[#2A2A2E] text-xs">
        {/* Hour Slider */}
        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#E4E4E7] mb-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Solar Time:
            </span>
            <span className="font-bold text-amber-300">{timeString}</span>
          </div>
          <input
            type="range"
            min="6.0"
            max="19.0"
            step="0.25"
            value={hourOfDay}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#222226] rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Day of Year / Solstice Presets */}
        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#E4E4E7] mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-400" />
              Day: {dayOfYear}
            </span>
          </div>
          <div className="flex gap-1">
            {solstices.map((s) => (
              <button
                key={s.dayOfYear}
                onClick={() => handleDayChange(s.dayOfYear)}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-mono transition-colors truncate ${
                  dayOfYear === s.dayOfYear
                    ? "bg-sky-600 text-white font-bold"
                    : "bg-[#18181B] text-[#A1A1AA] hover:text-[#E4E4E7] border border-[#2A2A2E]"
                }`}
              >
                {s.dayOfYear === 172 ? "Jun 21" : s.dayOfYear === 355 ? "Dec 21" : "Mar 21"}
              </button>
            ))}
          </div>
        </div>

        {/* Latitude Slider */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-[#A1A1AA] mb-0.5">
            <span>Latitude (φ):</span>
            <span className="text-[#E4E4E7] font-bold">{latitude}° {latitude >= 0 ? "N" : "S"}</span>
          </div>
          <input
            type="range"
            min="-60"
            max="70"
            step="0.5"
            value={latitude}
            onChange={(e) => handleLatitudeChange(Number(e.target.value))}
            className="w-full h-1 bg-[#222226] rounded appearance-none cursor-pointer accent-sky-500"
          />
        </div>
      </div>
    </div>
  );
};
