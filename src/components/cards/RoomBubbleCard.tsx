import React, { useState } from "react";
import {
  Sun,
  Volume2,
  Volume1,
  Users,
  Trash2,
  Copy,
  Link2,
  Check,
  Plus,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
} from "lucide-react";
import { RoomElement, RoomCategory, DaylightRequirement, AcousticLevel } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface RoomBubbleCardProps {
  element: RoomElement;
  isSelected: boolean;
}

const CATEGORY_STYLES: Record<
  RoomCategory,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  public: {
    bg: "bg-blue-950/40 hover:bg-blue-950/60",
    border: "border-blue-500/40",
    text: "text-blue-200",
    dot: "bg-blue-400",
    label: "Public",
  },
  private: {
    bg: "bg-purple-950/40 hover:bg-purple-950/60",
    border: "border-purple-500/40",
    text: "text-purple-200",
    dot: "bg-purple-400",
    label: "Private / Work",
  },
  service: {
    bg: "bg-amber-950/40 hover:bg-amber-950/60",
    border: "border-amber-500/40",
    text: "text-amber-200",
    dot: "bg-amber-400",
    label: "Service / Utility",
  },
  circulation: {
    bg: "bg-[#18181B]/90 hover:bg-[#222226]",
    border: "border-[#3F3F46]",
    text: "text-zinc-200",
    dot: "bg-zinc-400",
    label: "Circulation / Core",
  },
  outdoor: {
    bg: "bg-emerald-950/40 hover:bg-emerald-950/60",
    border: "border-emerald-500/40",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    label: "Outdoor / Deck",
  },
  technical: {
    bg: "bg-stone-950/80 hover:bg-stone-900",
    border: "border-stone-600/50",
    text: "text-stone-300",
    dot: "bg-stone-400",
    label: "Technical MEP",
  },
  cultural: {
    bg: "bg-rose-950/40 hover:bg-rose-950/60",
    border: "border-rose-500/40",
    text: "text-rose-200",
    dot: "bg-rose-400",
    label: "Cultural / Event",
  },
};

export const RoomBubbleCard: React.FC<RoomBubbleCardProps> = ({ element, isSelected }) => {
  const {
    updateElement,
    removeElement,
    activeTool,
    setConnectingSourceId,
    connectingSourceId,
    addConnector,
    activeConnectorType,
    addConnectedBranch,
    duplicateSelected,
  } = useStudio();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(element.name);
  const [area, setArea] = useState(element.targetAreaM2);
  const [widthM, setWidthM] = useState(element.widthM);
  const [lengthM, setLengthM] = useState(element.lengthM);
  const [category, setCategory] = useState<RoomCategory>(element.category);
  const [daylight, setDaylight] = useState<DaylightRequirement>(element.daylightReq);
  const [acoustic, setAcoustic] = useState<AcousticLevel>(element.acousticLevel);

  const style = CATEGORY_STYLES[element.category] || CATEGORY_STYLES.public;
  const isConnecting = activeTool === "connector" || Boolean(connectingSourceId);
  const isSource = connectingSourceId === element.id;

  const handleSave = () => {
    const newArea = Number(area) > 0 ? Number(area) : 20;
    const w = Number(widthM) > 0 ? Number(widthM) : Math.round(Math.sqrt(newArea) * 10) / 10;
    const l = Math.round((newArea / w) * 10) / 10;

    updateElement(element.id, {
      name,
      targetAreaM2: newArea,
      widthM: w,
      lengthM: l,
      category,
      daylightReq: daylight,
      acousticLevel: acoustic,
    });
    setIsEditing(false);
  };

  const handleConnectorPortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectingSourceId) {
      setConnectingSourceId(element.id);
    } else if (connectingSourceId !== element.id) {
      addConnector(connectingSourceId, element.id, activeConnectorType);
    }
  };

  const handleQuickBranch = (e: React.MouseEvent, direction: "right" | "bottom" | "left" | "top") => {
    e.stopPropagation();
    addConnectedBranch(element.id, {
      direction,
      category: element.category,
      name: `${element.name} Adj`,
      targetAreaM2: Math.round(element.targetAreaM2 * 0.8),
    });
  };

  return (
    <div
      onClick={isConnecting ? handleConnectorPortClick : undefined}
      className={`group/card relative rounded-xl border backdrop-blur-md transition-all select-none p-3 shadow-lg flex flex-col justify-between ${
        style.bg
      } ${
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400/40 shadow-amber-950/30"
          : `${style.border} hover:border-neutral-400`
      } ${isConnecting ? "cursor-crosshair ring-1 ring-amber-500/50" : ""}`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      {/* 4 Directional Connection Ports & Quick-Branch Handles */}
      {/* TOP PORT */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleQuickBranch(e, "top")}
          title="Add connected room above"
          className="w-5 h-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-full flex items-center justify-center shadow-md font-bold text-[10px] transform hover:scale-110 transition-transform"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={handleConnectorPortClick}
          title="Connect from top"
          className={`w-3.5 h-3.5 rounded-full border-2 border-white transition-colors ${
            isSource ? "bg-amber-400 animate-ping" : "bg-sky-400 hover:bg-amber-400"
          }`}
        />
      </div>

      {/* RIGHT PORT */}
      <div className="absolute top-1/2 -right-3 -translate-y-1/2 flex items-center gap-1 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <button
          onClick={handleConnectorPortClick}
          title="Connect from right"
          className={`w-3.5 h-3.5 rounded-full border-2 border-white transition-colors ${
            isSource ? "bg-amber-400 animate-ping" : "bg-sky-400 hover:bg-amber-400"
          }`}
        />
        <button
          onClick={(e) => handleQuickBranch(e, "right")}
          title="Add connected room to the right"
          className="w-5 h-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-full flex items-center justify-center shadow-md font-bold text-[10px] transform hover:scale-110 transition-transform"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* BOTTOM PORT */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center gap-1 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleQuickBranch(e, "bottom")}
          title="Add connected room below"
          className="w-5 h-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-full flex items-center justify-center shadow-md font-bold text-[10px] transform hover:scale-110 transition-transform"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={handleConnectorPortClick}
          title="Connect from bottom"
          className={`w-3.5 h-3.5 rounded-full border-2 border-white transition-colors ${
            isSource ? "bg-amber-400 animate-ping" : "bg-sky-400 hover:bg-amber-400"
          }`}
        />
      </div>

      {/* LEFT PORT */}
      <div className="absolute top-1/2 -left-3 -translate-y-1/2 flex flex-row-reverse items-center gap-1 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <button
          onClick={handleConnectorPortClick}
          title="Connect from left"
          className={`w-3.5 h-3.5 rounded-full border-2 border-white transition-colors ${
            isSource ? "bg-amber-400 animate-ping" : "bg-sky-400 hover:bg-amber-400"
          }`}
        />
        <button
          onClick={(e) => handleQuickBranch(e, "left")}
          title="Add connected room to the left"
          className="w-5 h-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-full flex items-center justify-center shadow-md font-bold text-[10px] transform hover:scale-110 transition-transform"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Top Bar: Category pill, Name, and Quick Actions */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-300">
              {style.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isConnecting ? (
              <button
                onClick={handleConnectorPortClick}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  isSource
                    ? "bg-amber-500 text-neutral-950 animate-pulse ring-1 ring-white"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                <Link2 className="w-2.5 h-2.5" />
                <span>{isSource ? "Source" : "Link"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectorPortClick(e);
                  }}
                  title="Draw Connector Line"
                  className="p-1 text-neutral-400 hover:text-sky-300 hover:bg-neutral-800/80 rounded transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeElement(element.id);
                  }}
                  title="Delete Room"
                  className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Room Name & Dimensions */}
        {isEditing ? (
          <div className="space-y-2 py-1 bg-[#0F0F11]/95 p-2 rounded-lg border border-[#2A2A2E]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#18181B] text-xs font-semibold px-2 py-1 rounded border border-amber-500 text-white outline-none w-full font-sans"
              placeholder="Room Name"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#A1A1AA]">Area (m²):</label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="bg-[#18181B] px-1.5 py-0.5 rounded border border-[#2A2A2E] text-white w-full font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#A1A1AA]">Category:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RoomCategory)}
                  className="bg-[#18181B] px-1 py-0.5 rounded border border-[#2A2A2E] text-white w-full text-xs"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="service">Service</option>
                  <option value="circulation">Circulation</option>
                  <option value="cultural">Cultural</option>
                  <option value="technical">Technical</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#A1A1AA]">Daylight:</label>
                <select
                  value={daylight}
                  onChange={(e) => setDaylight(e.target.value as DaylightRequirement)}
                  className="bg-[#18181B] px-1 py-0.5 rounded border border-[#2A2A2E] text-white w-full text-xs"
                >
                  <option value="diffuse_north">North (Diffuse)</option>
                  <option value="direct_south">South (Direct)</option>
                  <option value="morning_east">East (Morning)</option>
                  <option value="evening_west">West (Evening)</option>
                  <option value="any">Any / Flexible</option>
                  <option value="none">None / Internal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#A1A1AA]">Acoustic:</label>
                <select
                  value={acoustic}
                  onChange={(e) => setAcoustic(e.target.value as AcousticLevel)}
                  className="bg-[#18181B] px-1 py-0.5 rounded border border-[#2A2A2E] text-white w-full text-xs"
                >
                  <option value="quiet">Quiet (&lt;35 dB)</option>
                  <option value="moderate">Moderate</option>
                  <option value="loud">Loud (&gt;65 dB)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded text-xs flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Apply Changes</span>
            </button>
          </div>
        ) : (
          <div onDoubleClick={() => setIsEditing(true)} title="Double-click to edit room properties">
            <h4 className="text-xs font-bold text-[#E4E4E7] truncate">{element.name}</h4>
            <div className="flex items-baseline gap-1.5 mt-0.5 font-mono">
              <span className="text-sm font-extrabold text-amber-300">
                {element.targetAreaM2} m²
              </span>
              <span className="text-[10px] text-[#A1A1AA]">
                ({element.widthM}m × {element.lengthM}m)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Architectural Specs (Daylight, Acoustic, Occupancy) */}
      {!isEditing && (
        <div className="pt-2 mt-2 border-t border-[#2A2A2E]/80 flex items-center justify-between text-[10px] text-[#A1A1AA] font-mono">
          <div className="flex items-center gap-1" title={`Daylight Requirement: ${element.daylightReq}`}>
            <Sun className="w-3 h-3 text-orange-400" />
            <span className="capitalize">{element.daylightReq.replace("_", " ")}</span>
          </div>

          <div
            className="flex items-center gap-1"
            title={`Acoustic Level: ${element.acousticLevel}`}
          >
            {element.acousticLevel === "quiet" ? (
              <Volume1 className="w-3 h-3 text-emerald-400" />
            ) : element.acousticLevel === "loud" ? (
              <Volume2 className="w-3 h-3 text-red-400" />
            ) : (
              <Volume1 className="w-3 h-3 text-[#A1A1AA]" />
            )}
            <span
              className={`capitalize ${
                element.acousticLevel === "quiet"
                  ? "text-emerald-300"
                  : element.acousticLevel === "loud"
                  ? "text-red-300 font-semibold"
                  : "text-[#A1A1AA]"
              }`}
            >
              {element.acousticLevel}
            </span>
          </div>

          {element.occupancy ? (
            <div className="flex items-center gap-1" title={`Capacity: ${element.occupancy} people`}>
              <Users className="w-3 h-3 text-[#A1A1AA]" />
              <span>{element.occupancy}p</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
