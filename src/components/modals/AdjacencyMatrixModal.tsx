import React from "react";
import { useStudio } from "../../context/StudioContext";
import { RoomElement, ConnectorType } from "../../types";
import {
  FileSpreadsheet,
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRightLeft,
} from "lucide-react";

export const AdjacencyMatrixModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    boardElements,
    boardConnectors,
    addConnector,
    removeConnector,
    updateConnector,
    autoClusterLayout,
  } = useStudio();

  if (activeModal !== "adjacency_matrix") return null;

  const rooms = boardElements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );

  // Map of connector relationships
  const getConnectorBetween = (id1: string, id2: string) => {
    return boardConnectors.find(
      (c) =>
        (c.sourceId === id1 && c.targetId === id2) ||
        (c.sourceId === id2 && c.targetId === id1)
    );
  };

  // Cycle relationship type on matrix cell click
  const handleCellClick = (r1: RoomElement, r2: RoomElement) => {
    if (r1.id === r2.id) return;
    const existing = getConnectorBetween(r1.id, r2.id);

    if (!existing) {
      // Create Direct Access
      addConnector(r1.id, r2.id, "direct_access", "Direct Access");
    } else if (existing.type === "direct_access") {
      updateConnector(existing.id, { type: "visual_link", label: "Visual Link" });
    } else if (existing.type === "visual_link") {
      updateConnector(existing.id, { type: "service_link", label: "Service Link" });
    } else if (existing.type === "service_link") {
      updateConnector(existing.id, { type: "acoustic_conflict", label: "Acoustic Conflict" });
    } else {
      // Remove connector
      removeConnector(existing.id);
    }
  };

  // Identify acoustic conflicts
  const acousticConflicts = boardConnectors.filter((c) => c.type === "acoustic_conflict");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0F0F11] border border-[#2A2A2E] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2E] bg-[#151517]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E4E4E7] flex items-center gap-2">
                <span>Architectural Adjacency & Functional Matrix</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  {rooms.length} Spaces × {rooms.length} Pairs
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Click cells to toggle direct circulation, visual transparency, service links, and acoustic conflicts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                autoClusterLayout();
                setActiveModal("none");
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Cluster Program</span>
            </button>

            <button
              onClick={() => setActiveModal("none")}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2E] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Matrix Legend Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#18181B] border-b border-[#2A2A2E] text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase">Relationship Types:</span>
            <div className="flex items-center gap-1.5 text-[#E4E4E7]">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[11px]">Direct Access</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#E4E4E7]">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className="text-[11px]">Visual Link</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#E4E4E7]">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-[11px]">Service Link</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#E4E4E7]">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-[11px]">Acoustic Conflict</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#A1A1AA]">
            Tip: Click any cell to cycle connection state
          </div>
        </div>

        {/* Matrix Grid Scroll Area */}
        <div className="flex-1 p-6 overflow-auto bg-[#09090b]">
          {rooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500">
              <FileSpreadsheet className="w-12 h-12 mb-2 opacity-30" />
              <p>No room bubbles found on current board. Add rooms to build an adjacency matrix.</p>
            </div>
          ) : (
            <div className="inline-block min-w-full">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-[#2A2A2E] bg-[#151517] text-left text-xs font-mono text-[#A1A1AA] min-w-[140px]">
                      Spatial Program
                    </th>
                    {rooms.map((room) => (
                      <th
                        key={room.id}
                        className="p-2 border border-[#2A2A2E] bg-[#151517] text-xs font-mono text-[#E4E4E7] w-20 text-center truncate max-w-[80px]"
                        title={room.name}
                      >
                        <div className="truncate">{room.name}</div>
                        <div className="text-[9px] text-[#A1A1AA]">{room.targetAreaM2}m²</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r1, i) => (
                    <tr key={r1.id}>
                      {/* Row Header */}
                      <td className="p-2 border border-[#2A2A2E] bg-[#151517] text-xs font-medium text-[#E4E4E7]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r1.category === "public"
                                ? "bg-sky-400"
                                : r1.category === "private"
                                ? "bg-purple-400"
                                : r1.category === "circulation"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          />
                          <span className="truncate">{r1.name}</span>
                        </div>
                      </td>

                      {/* Matrix Intersection Cells */}
                      {rooms.map((r2, j) => {
                        const isSelf = r1.id === r2.id;
                        const isHalf = j < i; // Lower triangle
                        const conn = getConnectorBetween(r1.id, r2.id);

                        if (isSelf) {
                          return (
                            <td
                              key={r2.id}
                              className="border border-[#2A2A2E] bg-[#18181B]/50 text-center"
                            >
                              <div className="w-full h-8 flex items-center justify-center font-mono text-neutral-600 text-xs">
                                —
                              </div>
                            </td>
                          );
                        }

                        let cellBg = "hover:bg-[#222226]";
                        let icon = null;

                        if (conn) {
                          if (conn.type === "direct_access") {
                            cellBg = "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40";
                            icon = (
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] border border-emerald-500/40">
                                D
                              </span>
                            );
                          } else if (conn.type === "visual_link") {
                            cellBg = "bg-blue-950/40 hover:bg-blue-900/50 border-blue-500/40";
                            icon = (
                              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-[10px] border border-blue-500/40">
                                V
                              </span>
                            );
                          } else if (conn.type === "service_link") {
                            cellBg = "bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40";
                            icon = (
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-[10px] border border-amber-500/40">
                                S
                              </span>
                            );
                          } else if (conn.type === "acoustic_conflict") {
                            cellBg = "bg-red-950/40 hover:bg-red-900/50 border-red-500/40";
                            icon = (
                              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-mono font-bold text-[10px] border border-red-500/40">
                                !
                              </span>
                            );
                          }
                        }

                        return (
                          <td
                            key={r2.id}
                            onClick={() => handleCellClick(r1, r2)}
                            className={`border border-[#2A2A2E] text-center cursor-pointer transition-all ${cellBg}`}
                          >
                            <div className="w-full h-8 flex items-center justify-center">
                              {icon}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="px-6 py-3 bg-[#151517] border-t border-[#2A2A2E] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-4">
            <span>Total Connectors: <strong className="text-[#E4E4E7] font-mono">{boardConnectors.length}</strong></span>
            {acousticConflicts.length > 0 && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {acousticConflicts.length} Acoustic Conflicts Active
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#A1A1AA]">
            Clicking <strong>Auto-Cluster Program</strong> runs physical spring relaxation on your canvas
          </div>
        </div>
      </div>
    </div>
  );
};
