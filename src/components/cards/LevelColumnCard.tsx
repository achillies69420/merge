import React, { useState } from "react";
import {
  Layers,
  Maximize2,
  Trash2,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { LevelColumnElement, RoomElement } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface LevelColumnCardProps {
  element: LevelColumnElement;
  isSelected: boolean;
}

export const LevelColumnCard: React.FC<LevelColumnCardProps> = ({ element, isSelected }) => {
  const {
    elements,
    updateElement,
    removeElement,
    addElement,
    activeBoard,
    bringToFront,
  } = useStudio();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(element.name);
  const [elevation, setElevation] = useState(element.elevationM);
  const [maxFootprint, setMaxFootprint] = useState(element.maxFootprintM2);

  // Compute live sum of rooms assigned to this column
  const nestedRooms = elements.filter(
    (el): el is RoomElement => el.type === "room_bubble" && el.parentColumnId === element.id
  );

  const currentAreaSum = nestedRooms.reduce((sum, r) => sum + (r.targetAreaM2 || 0), 0);
  const isOverflow = element.maxFootprintM2 > 0 && currentAreaSum > element.maxFootprintM2;
  const occupancySum = nestedRooms.reduce((sum, r) => sum + (r.occupancy || 0), 0);
  const progressPercent = element.maxFootprintM2 > 0
    ? Math.min(100, Math.round((currentAreaSum / element.maxFootprintM2) * 100))
    : 0;

  const handleAddRoomInside = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRoomId = addElement({
      type: "room_bubble",
      name: `Room L${element.levelNumber}.${nestedRooms.length + 1}`,
      category: "public",
      targetAreaM2: 45,
      widthM: 6.0,
      lengthM: 7.5,
      ceilingHeightM: 3.5,
      occupancy: 12,
      daylightReq: "diffuse_north",
      acousticLevel: "quiet",
      parentColumnId: element.id,
      boardId: activeBoard.id,
      x: element.x + 20,
      y: element.y + 120 + nestedRooms.length * 125,
      width: 320,
      height: 110,
    });
  };

  return (
    <div
      className={`h-full flex flex-col rounded-xl border transition-all select-none shadow-2xl ${
        isSelected
          ? "border-amber-400 bg-[#151517]/95 ring-2 ring-amber-400/20"
          : "border-[#2A2A2E] bg-[#151517]/90 hover:border-[#3F3F46]"
      }`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      {/* Column Header (Milanote Level Banner) */}
      <div className="px-4 py-3 bg-[#0F0F11]/90 rounded-t-xl border-b border-[#2A2A2E] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </div>

          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                updateElement(element.id, { name, elevationM: Number(elevation), maxFootprintM2: Number(maxFootprint) });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditing(false);
                  updateElement(element.id, { name, elevationM: Number(elevation), maxFootprintM2: Number(maxFootprint) });
                }
              }}
              autoFocus
              className="bg-[#18181B] text-xs font-semibold px-2 py-0.5 rounded border border-amber-500 text-white outline-none w-full font-sans"
            />
          ) : (
            <div
              onDoubleClick={() => setIsEditing(true)}
              className="cursor-pointer flex-1 min-w-0"
              title="Double-click to rename level column"
            >
              <h3 className="text-xs font-bold text-[#E4E4E7] truncate">{element.name}</h3>
              <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] font-mono">
                <span>Elev: {element.elevationM >= 0 ? `+${element.elevationM.toFixed(1)}` : element.elevationM.toFixed(1)}m</span>
                <span>•</span>
                <span>{nestedRooms.length} Spaces</span>
              </div>
            </div>
          )}
        </div>

        {/* Level Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddRoomInside}
            title="Add Room inside this Level"
            className="p-1 rounded text-[#A1A1AA] hover:text-amber-400 hover:bg-[#222226] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeElement(element.id)}
            title="Delete level container"
            className="p-1 rounded text-[#A1A1AA] hover:text-red-400 hover:bg-[#222226] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Column Container Body (Droppable Canvas Area) */}
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto min-h-[300px] border-b border-[#2A2A2E]/80">
        {nestedRooms.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-[#2A2A2E] rounded-lg text-[#A1A1AA]">
            <Layers className="w-8 h-8 text-[#71717A] mb-2 opacity-50" />
            <p className="text-xs font-medium text-[#A1A1AA]">Level Container Empty</p>
            <p className="text-[11px] text-[#71717A] mt-1 max-w-[200px]">
              Drag Room Cards into this column or click + to add spaces.
            </p>
            <button
              onClick={handleAddRoomInside}
              className="mt-3 px-2.5 py-1 bg-[#18181B] hover:bg-[#222226] text-[#E4E4E7] rounded text-xs flex items-center gap-1 border border-[#2A2A2E]"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>Add Space</span>
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-[#A1A1AA] font-mono px-1 flex items-center justify-between">
            <span>ALLOCATED ROOMS</span>
            <span>{occupancySum} OCCUPANTS</span>
          </div>
        )}
      </div>

      {/* Column Footer: Real-time Floorplate Sum vs Legal Limit */}
      <div className="p-3 bg-[#0F0F11]/90 rounded-b-xl border-t border-[#2A2A2E] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#A1A1AA]">Floorplate Area:</span>
          <div className="flex items-baseline gap-1">
            <span className={`font-bold ${isOverflow ? "text-red-400" : "text-[#E4E4E7]"}`}>
              {currentAreaSum.toFixed(1)}
            </span>
            <span className="text-[#A1A1AA] text-[10px]">/ {element.maxFootprintM2} m²</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-1.5 bg-[#222226] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverflow ? "bg-red-500" : progressPercent > 90 ? "bg-amber-500" : "bg-sky-500"
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {isOverflow && (
          <div className="flex items-center gap-1 text-[11px] text-red-400 bg-red-950/40 px-2 py-1 rounded border border-red-800/50">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Exceeds max floorplate by +{(currentAreaSum - element.maxFootprintM2).toFixed(1)} m²</span>
          </div>
        )}
      </div>
    </div>
  );
};
