import React, { useState } from "react";
import { StickyNote, CheckSquare, Square, Trash2, Plus, Pin } from "lucide-react";
import { NoteElement } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface NoteCardProps {
  element: NoteElement;
  isSelected: boolean;
}

const THEME_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  amber: { bg: "bg-amber-950/20", border: "border-amber-500/30", accent: "text-amber-400" },
  emerald: { bg: "bg-emerald-950/20", border: "border-emerald-500/30", accent: "text-emerald-400" },
  slate: { bg: "bg-[#151517]/90", border: "border-[#2A2A2E]", accent: "text-zinc-300" },
  indigo: { bg: "bg-indigo-950/20", border: "border-indigo-500/30", accent: "text-indigo-400" },
  rose: { bg: "bg-rose-950/20", border: "border-rose-500/30", accent: "text-rose-400" },
};

export const NoteCard: React.FC<NoteCardProps> = ({ element, isSelected }) => {
  const { updateElement, removeElement } = useStudio();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.title);
  const [content, setContent] = useState(element.content);
  const [newCheckItem, setNewCheckItem] = useState("");

  const theme = THEME_STYLES[element.colorTheme] || THEME_STYLES.amber;

  const toggleChecklist = (checkId: string) => {
    const updated = element.checklist.map((item) =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );
    updateElement(element.id, { checklist: updated });
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    const updated = [
      ...element.checklist,
      { id: `c-${Date.now()}`, text: newCheckItem.trim(), done: false },
    ];
    updateElement(element.id, { checklist: updated });
    setNewCheckItem("");
  };

  const removeChecklistItem = (id: string) => {
    const updated = element.checklist.filter((i) => i.id !== id);
    updateElement(element.id, { checklist: updated });
  };

  const completedCount = element.checklist.filter((c) => c.done).length;

  return (
    <div
      className={`rounded-xl border backdrop-blur-md transition-all select-none p-3.5 shadow-2xl flex flex-col justify-between ${
        theme.bg
      } ${
        isSelected
          ? "border-amber-400 ring-2 ring-amber-400/20"
          : `${theme.border} hover:border-[#3F3F46]`
      }`}
      style={{
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2 mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <StickyNote className={`w-3.5 h-3.5 ${theme.accent}`} />
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditing(false);
                  updateElement(element.id, { title, content });
                }}
                className="bg-[#18181B] text-xs font-bold px-1.5 py-0.5 rounded border border-amber-500 text-white outline-none w-full font-sans"
              />
            ) : (
              <h4
                onDoubleClick={() => setIsEditing(true)}
                className="text-xs font-bold text-[#E4E4E7] truncate cursor-pointer"
                title="Double click to edit title"
              >
                {element.title}
              </h4>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => removeElement(element.id)}
              className="p-1 text-[#A1A1AA] hover:text-red-400 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Paragraph */}
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              updateElement(element.id, { title, content });
            }}
            rows={3}
            className="w-full bg-[#0F0F11]/90 text-xs text-[#E4E4E7] p-2 rounded border border-[#2A2A2E] outline-none resize-none font-sans"
          />
        ) : (
          <p
            onDoubleClick={() => setIsEditing(true)}
            className="text-xs text-[#D4D4D8] leading-relaxed cursor-pointer font-sans"
            title="Double-click to edit note text"
          >
            {element.content}
          </p>
        )}

        {/* Checklist Section */}
        {element.checklist && element.checklist.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#2A2A2E] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1AA]">
              <span>CHECKLIST & CRITERIA</span>
              <span>
                {completedCount}/{element.checklist.length} Completed
              </span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto">
              {element.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-0.5 px-1 rounded hover:bg-[#222226] group"
                >
                  <button
                    onClick={() => toggleChecklist(item.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {item.done ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-[#71717A] flex-shrink-0" />
                    )}
                    <span
                      className={`truncate ${
                        item.done ? "line-through text-[#71717A]" : "text-[#E4E4E7]"
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>

                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#71717A] hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Checklist item form */}
      <div className="mt-2 pt-2 border-t border-[#2A2A2E] flex items-center gap-1">
        <input
          type="text"
          placeholder="Add requirement item..."
          value={newCheckItem}
          onChange={(e) => setNewCheckItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
          className="flex-1 bg-[#0F0F11]/90 text-[11px] px-2 py-1 rounded border border-[#2A2A2E] text-[#E4E4E7] outline-none font-sans"
        />
        <button
          onClick={addChecklistItem}
          className="p-1 bg-[#18181B] hover:bg-[#222226] text-[#E4E4E7] rounded border border-[#2A2A2E]"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
