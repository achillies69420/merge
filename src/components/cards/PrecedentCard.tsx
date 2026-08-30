import React, { useState } from "react";
import { Bookmark, MapPin, Calendar, Globe, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { PrecedentElement } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface PrecedentCardProps {
  element: PrecedentElement;
  isSelected: boolean;
}

export const PrecedentCard: React.FC<PrecedentCardProps> = ({ element, isSelected }) => {
  const { updateElement, removeElement } = useStudio();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.title);
  const [architect, setArchitect] = useState(element.architect);
  const [location, setLocation] = useState(element.location);
  const [year, setYear] = useState(element.year);
  const [climate, setClimate] = useState(element.climateZone);
  const [imageUrl, setImageUrl] = useState(element.imageUrl || "");
  const [notes, setNotes] = useState(element.notes);

  return (
    <div
      className={`rounded-xl border backdrop-blur-md overflow-hidden transition-all select-none shadow-2xl flex flex-col ${
        isSelected
          ? "border-amber-400 bg-[#151517]/95 ring-2 ring-amber-400/20"
          : "border-[#2A2A2E] bg-[#151517]/90 hover:border-[#3F3F46]"
      }`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      {/* Precedent Hero Image / Thumbnail */}
      <div className="relative h-40 bg-[#0F0F11] overflow-hidden border-b border-[#2A2A2E]">
        {element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt={element.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-90 hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] bg-[#0F0F11]">
            <Bookmark className="w-8 h-8 mb-1 opacity-40 text-indigo-400" />
            <span className="text-xs font-mono">No Image Attached</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-[#0F0F11]/80 backdrop-blur rounded text-[10px] font-mono font-semibold text-indigo-300 border border-indigo-500/30">
            PRECEDENT CASE STUDY
          </span>
        </div>

        <button
          onClick={() => removeElement(element.id)}
          title="Delete Precedent Card"
          className="absolute top-2 right-2 p-1.5 bg-[#0F0F11]/80 hover:bg-red-950 text-[#A1A1AA] hover:text-red-400 rounded-md backdrop-blur border border-[#2A2A2E] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-[#E4E4E7] bg-[#0F0F11]/80 backdrop-blur px-2 py-1 rounded border border-[#2A2A2E]">
          <span className="truncate">{element.typology}</span>
          <span>{element.year}</span>
        </div>
      </div>

      {/* Card Content Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#E4E4E7]">{element.title}</h3>
          <p className="text-xs font-medium text-amber-400 font-sans mt-0.5">
            {element.architect}
          </p>

          <div className="flex items-center gap-3 text-[11px] text-[#A1A1AA] font-mono mt-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#A1A1AA]" />
              <span className="truncate max-w-[140px]">{element.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#A1A1AA]" />
              <span>{element.climateZone}</span>
            </div>
          </div>
        </div>

        {/* Key Architectural Concepts */}
        {element.keyConcepts && element.keyConcepts.length > 0 && (
          <div className="space-y-1 bg-[#0F0F11]/80 p-2 rounded-lg border border-[#2A2A2E]">
            <span className="text-[9px] font-mono uppercase text-[#A1A1AA] font-semibold tracking-wider">
              Key Spatial Concepts
            </span>
            <ul className="space-y-1 text-[11px] text-[#E4E4E7]">
              {element.keyConcepts.map((concept, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                  <span className="leading-tight">{concept}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes / Jury Citation */}
        <p className="text-xs text-[#A1A1AA] italic bg-[#0F0F11]/40 p-2 rounded border border-[#2A2A2E]">
          "{element.notes}"
        </p>
      </div>
    </div>
  );
};
