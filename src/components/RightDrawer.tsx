import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  Bot,
  Layers,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Send,
  Wand2,
  Building,
  RefreshCw,
  HelpCircle,
  Cpu,
  Compass,
  Sliders,
} from "lucide-react";
import { useStudio } from "../context/StudioContext";
import { AIEngineMode } from "../types";

export const RightDrawer: React.FC = () => {
  const {
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    rightDrawerTab,
    setRightDrawerTab,
    spatialIssues,
    metrics,
    project,
    setProject,
    elements,
    boardElements,
    connectors,
    addElement,
    addConnector,
    activeBoard,
    aiEngineMode,
    setAiEngineMode,
  } = useStudio();

  // AI Assistant states
  const [typologyPrompt, setTypologyPrompt] = useState("Community Arts Hub & Ceramic Studio with 200-seat theater, gallery, cafe, and admin offices");
  const [totalAreaPrompt, setTotalAreaPrompt] = useState(1200);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);

  const [critiqueResult, setCritiqueResult] = useState<string | null>(null);
  const [isGeneratingCritique, setIsGeneratingCritique] = useState(false);

  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Welcome to ArchiCanvas AI Studio Assistant. I can generate complete architectural room programs, perform formal studio jury critiques, and advise on passive solar zoning.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  if (!isRightDrawerOpen) return null;

  // Handle AI Program Generator
  const handleGenerateProgram = async () => {
    setIsGeneratingProgram(true);
    try {
      const response = await fetch("/api/ai/program-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typology: typologyPrompt,
          totalAreaM2: totalAreaPrompt,
          siteContext: `Plot Area: ${project.siteAreaM2}m², Max Height: ${project.maxBuildingHeightM}m, Climate: Temperate`,
        }),
      });

      const data = await response.json();
      if (data.spaces && Array.isArray(data.spaces)) {
        // Add generated rooms onto the active board in a neat matrix
        let startX = 250;
        let startY = 150;
        data.spaces.forEach((sp: any, idx: number) => {
          const colIndex = Math.floor(idx / 4);
          const rowIndex = idx % 4;

          addElement({
            type: "room_bubble",
            name: sp.name || "Generated Space",
            category: sp.category || "public",
            targetAreaM2: sp.targetAreaM2 || 50,
            widthM: sp.widthM || Math.round(Math.sqrt(sp.targetAreaM2 || 50) * 10) / 10,
            lengthM: sp.lengthM || Math.round(Math.sqrt(sp.targetAreaM2 || 50) * 10) / 10,
            ceilingHeightM: sp.ceilingHeightM || 3.5,
            occupancy: sp.occupancy || 10,
            daylightReq: sp.daylightReq || "diffuse_north",
            acousticLevel: sp.acousticLevel || "quiet",
            boardId: activeBoard.id,
            x: startX + colIndex * 340,
            y: startY + rowIndex * 125,
            width: 320,
            height: 110,
          });
        });

        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `Generated ${data.spaces.length} architectural spaces for "${typologyPrompt}" totaling approx ${totalAreaPrompt} m². They are now placed onto your board.`,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingProgram(false);
    }
  };

  // Handle Studio Jury Critique
  const handleGenerateCritique = async () => {
    setIsGeneratingCritique(true);
    try {
      const response = await fetch("/api/ai/studio-critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
            name: project.name,
            siteAreaM2: project.siteAreaM2,
            metrics,
            rooms: elements.filter((e) => e.type === "room_bubble"),
            connectors,
            issues: spatialIssues,
          },
        }),
      });

      const data = await response.json();
      setCritiqueResult(data.critique || data.text || "Critique generated.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCritique(false);
    }
  };

  // Handle Studio Chat
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          context: {
            projectName: project.name,
            siteAreaM2: project.siteAreaM2,
            totalGfaM2: metrics.totalGfaM2,
            cesPercent: metrics.cesPercent,
            cosRatio: metrics.cosRatio,
            roomCount: elements.filter((e) => e.type === "room_bubble").length,
          },
        }),
      });
      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply || "No response received." },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Unable to reach studio assistant server. Running in offline mode." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <aside className="w-96 bg-[#151517]/95 backdrop-blur-xl border-l border-[#2A2A2E] flex flex-col z-30 select-none shadow-2xl text-[#E4E4E7]">
      {/* Drawer Header */}
      <div className="h-14 px-4 border-b border-[#2A2A2E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0F0F11] p-1 rounded-lg border border-[#2A2A2E]">
            <button
              onClick={() => setRightDrawerTab("rules")}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                rightDrawerTab === "rules"
                  ? "bg-[#222226] text-amber-400 shadow"
                  : "text-[#A1A1AA] hover:text-[#E4E4E7]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CAD Rules ({spatialIssues.length})</span>
            </button>
            <button
              onClick={() => setRightDrawerTab("ai")}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                rightDrawerTab === "ai"
                  ? "bg-[#222226] text-amber-400 shadow"
                  : "text-[#A1A1AA] hover:text-[#E4E4E7]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsRightDrawerOpen(false)}
          className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {rightDrawerTab === "rules" ? (
          /* ================= RULE INSPECTOR & ZONING PARAMETERS TAB ================= */
          <div className="space-y-4">
            {/* Live Issues List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#E4E4E7]">
                <span>SPATIAL & ZONING AUDIT</span>
                <span className="text-[10px] text-[#A1A1AA] uppercase">
                  100% Deterministic Math
                </span>
              </div>

              {spatialIssues.length === 0 ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-300">All Spatial Rules Satisfied</p>
                  <p className="text-[11px] text-emerald-400/80">
                    Zoning coverage, FAR, circulation, and daylight alignments meet architectural standards.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {spatialIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        issue.severity === "error"
                          ? "bg-red-950/40 border-red-800/80 text-red-200"
                          : issue.severity === "warning"
                          ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                          : "bg-blue-950/40 border-blue-800/80 text-blue-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {issue.severity === "error" ? (
                          <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-bold text-neutral-100">{issue.title}</h4>
                          <p className="text-[11px] text-[#E4E4E7] leading-relaxed mt-0.5">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      {issue.suggestedFix && (
                        <div className="pt-1.5 mt-1 border-t border-[#2A2A2E]/60 flex items-center justify-between text-[11px]">
                          <span className="text-amber-300 font-mono">💡 {issue.suggestedFix}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Site & Zoning Parameters Editor */}
            <div className="p-3.5 bg-[#121214]/80 rounded-xl border border-[#2A2A2E] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E4E4E7] uppercase">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Site & Zoning Controls</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#A1A1AA] font-mono">Plot Area (m²):</label>
                  <input
                    type="number"
                    value={project.siteAreaM2}
                    onChange={(e) => setProject({ siteAreaM2: Number(e.target.value) })}
                    className="w-full bg-[#0F0F11] px-2 py-1 rounded border border-[#2A2A2E] text-white font-mono text-xs outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#A1A1AA] font-mono">Max Coverage (CES %):</label>
                  <input
                    type="number"
                    value={project.maxCESPercent}
                    onChange={(e) => setProject({ maxCESPercent: Number(e.target.value) })}
                    className="w-full bg-[#0F0F11] px-2 py-1 rounded border border-[#2A2A2E] text-white font-mono text-xs outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#A1A1AA] font-mono">Max FAR (COS):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={project.maxCOS}
                    onChange={(e) => setProject({ maxCOS: Number(e.target.value) })}
                    className="w-full bg-[#0F0F11] px-2 py-1 rounded border border-[#2A2A2E] text-white font-mono text-xs outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#A1A1AA] font-mono">Circulation Factor:</label>
                  <input
                    type="number"
                    step="0.05"
                    value={project.circulationFactor}
                    onChange={(e) => setProject({ circulationFactor: Number(e.target.value) })}
                    className="w-full bg-[#0F0F11] px-2 py-1 rounded border border-[#2A2A2E] text-white font-mono text-xs outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= AI ASSISTANT TAB ================= */
          <div className="space-y-4">
            {/* AI Engine Selector */}
            <div className="p-3 bg-[#121214]/80 rounded-xl border border-[#2A2A2E] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#E4E4E7] font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  AI Execution Engine:
                </span>
                <span className="text-[10px] text-amber-400 uppercase font-semibold">
                  Modular
                </span>
              </div>
              <select
                value={aiEngineMode}
                onChange={(e) => setAiEngineMode(e.target.value as AIEngineMode)}
                className="w-full bg-[#0F0F11] text-xs px-2 py-1.5 rounded border border-[#2A2A2E] text-[#E4E4E7] outline-none font-mono"
              >
                <option value="gemini_flash">Gemini 2.5 Flash (Server Proxy)</option>
                <option value="offline_rule_engine">100% Offline Rule Engine (No AI)</option>
                <option value="local_ollama">Local Ollama / Llama 3 (Self-Hosted)</option>
              </select>
            </div>

            {/* AI Program Generator Form */}
            <div className="p-3.5 bg-[#121214]/80 rounded-xl border border-[#2A2A2E] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E4E4E7] uppercase">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Architectural Program Generator</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#A1A1AA] font-mono">Project Brief / Typology:</label>
                <textarea
                  value={typologyPrompt}
                  onChange={(e) => setTypologyPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0F0F11] text-xs p-2 rounded border border-[#2A2A2E] text-white outline-none resize-none font-sans focus:border-amber-500/80"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-[#A1A1AA]">Target GFA:</span>
                  <input
                    type="number"
                    value={totalAreaPrompt}
                    onChange={(e) => setTotalAreaPrompt(Number(e.target.value))}
                    className="w-20 bg-[#0F0F11] px-2 py-0.5 rounded border border-[#2A2A2E] text-white font-mono text-xs focus:border-amber-500/80"
                  />
                  <span className="text-[#A1A1AA]">m²</span>
                </div>

                <button
                  onClick={handleGenerateProgram}
                  disabled={isGeneratingProgram}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
                >
                  {isGeneratingProgram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingProgram ? "Synthesizing..." : "Generate Spaces"}</span>
                </button>
              </div>
            </div>

            {/* Studio Jury Critique */}
            <div className="p-3.5 bg-[#121214]/80 rounded-xl border border-[#2A2A2E] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E4E4E7] uppercase">
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  <span>Studio Jury Critique</span>
                </div>
                <button
                  onClick={handleGenerateCritique}
                  disabled={isGeneratingCritique}
                  className="px-2.5 py-1 bg-[#18181B] hover:bg-[#222226] text-[#E4E4E7] rounded text-xs flex items-center gap-1 border border-[#2A2A2E]"
                >
                  {isGeneratingCritique ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3 text-amber-400" />}
                  <span>Run Crit</span>
                </button>
              </div>

              {critiqueResult && (
                <div className="p-3 bg-[#0F0F11] rounded-lg text-xs text-[#E4E4E7] font-sans leading-relaxed border border-[#2A2A2E] whitespace-pre-line max-h-48 overflow-y-auto">
                  {critiqueResult}
                </div>
              )}
            </div>

            {/* Studio Chat Box */}
            <div className="p-3.5 bg-[#121214]/80 rounded-xl border border-[#2A2A2E] space-y-3">
              <div className="text-xs font-mono font-bold text-[#E4E4E7] uppercase flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                <span>Studio Assistant Q&A</span>
              </div>

              <div className="h-44 bg-[#0F0F11] rounded-lg p-2.5 overflow-y-auto space-y-2 text-xs border border-[#2A2A2E]">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg leading-relaxed ${
                      msg.role === "user"
                        ? "bg-amber-500/20 text-amber-100 border border-amber-500/30 ml-4"
                        : "bg-[#18181B] text-[#E4E4E7] border border-[#2A2A2E] mr-4"
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold uppercase block text-[#A1A1AA] mb-0.5">
                      {msg.role === "user" ? "You" : "Studio AI"}
                    </span>
                    {msg.text}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="p-2 bg-[#18181B] text-[#A1A1AA] rounded-lg text-xs italic flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Analyzing spatial parameters...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Ask about passive solar, egress codes..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  className="flex-1 bg-[#0F0F11] text-xs px-2.5 py-1.5 rounded-lg border border-[#2A2A2E] text-white outline-none font-sans focus:border-amber-500/80"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="p-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
