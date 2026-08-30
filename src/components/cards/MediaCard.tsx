import React, { useState, useRef } from "react";
import { Image as ImageIcon, Trash2, Upload, Maximize2, Tag } from "lucide-react";
import { MediaElement } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface MediaCardProps {
  element: MediaElement;
  isSelected: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ element, isSelected }) => {
  const { updateElement, removeElement } = useStudio();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.title);
  const [caption, setCaption] = useState(element.caption || "");
  const [scaleTag, setScaleTag] = useState(element.realWorldScale || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        updateElement(element.id, { imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        updateElement(element.id, { imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className={`rounded-xl border backdrop-blur-md overflow-hidden transition-all select-none shadow-2xl flex flex-col justify-between ${
        isSelected
          ? "border-amber-400 bg-[#151517]/95 ring-2 ring-amber-400/20"
          : "border-[#2A2A2E] bg-[#151517]/90 hover:border-[#3F3F46]"
      }`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      {/* Media Viewport / Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative h-48 bg-[#0F0F11] flex items-center justify-center overflow-hidden border-b border-[#2A2A2E] group"
      >
        {element.imageUrl ? (
          <img
            src={element.imageUrl}
            alt={element.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-[#18181B] w-full h-full text-[#A1A1AA]"
          >
            <Upload className="w-6 h-6 mb-2 text-teal-400 opacity-60" />
            <span className="text-xs font-semibold text-[#E4E4E7]">Drop Image or Click to Upload</span>
            <span className="text-[10px] text-[#71717A] mt-1">Site Plan, Section, or Material Reference</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Top Badges & Actions */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {element.realWorldScale && (
            <span className="px-2 py-0.5 bg-[#0F0F11]/80 backdrop-blur rounded text-[10px] font-mono text-teal-300 border border-teal-500/30">
              {element.realWorldScale}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <label className="p-1.5 bg-[#0F0F11]/80 hover:bg-[#222226] text-[#E4E4E7] rounded-md backdrop-blur border border-[#2A2A2E] cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => removeElement(element.id)}
            className="p-1.5 bg-[#0F0F11]/80 hover:bg-red-950 text-[#A1A1AA] hover:text-red-400 rounded-md backdrop-blur border border-[#2A2A2E]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Info & Caption */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Media Title"
              className="w-full bg-[#18181B] text-xs px-2 py-1 rounded border border-amber-500 text-white outline-none font-sans"
            />
            <input
              type="text"
              value={scaleTag}
              onChange={(e) => setScaleTag(e.target.value)}
              placeholder="Scale Tag (e.g. 1:200 Plan)"
              className="w-full bg-[#18181B] text-xs px-2 py-1 rounded border border-[#2A2A2E] text-[#E4E4E7] outline-none font-mono"
            />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption & notes"
              rows={2}
              className="w-full bg-[#18181B] text-xs px-2 py-1 rounded border border-[#2A2A2E] text-[#E4E4E7] outline-none font-sans resize-none"
            />
            <button
              onClick={() => {
                setIsEditing(false);
                updateElement(element.id, { title, caption, realWorldScale: scaleTag });
              }}
              className="w-full py-1 bg-amber-500 text-neutral-950 font-bold rounded text-xs"
            >
              Save Details
            </button>
          </div>
        ) : (
          <div onDoubleClick={() => setIsEditing(true)} className="cursor-pointer" title="Double click to edit details">
            <h4 className="text-xs font-bold text-[#E4E4E7]">{element.title}</h4>
            {element.caption && (
              <p className="text-[11px] text-[#A1A1AA] mt-1 line-clamp-2 leading-relaxed">
                {element.caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
