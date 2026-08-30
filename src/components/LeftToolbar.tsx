import React, { useState } from "react";
import {
  MousePointer,
  Hand,
  Columns,
  Square,
  PenTool,
  Bookmark,
  Sun,
  StickyNote,
  Image as ImageIcon,
  Link2,
  ChevronRight,
  Plus,
  ShieldAlert,
  Sparkles,
  Ruler,
  SplitSquareVertical,
} from "lucide-react";
import { useStudio, ToolType } from "../context/StudioContext";
import { ConnectorType, RoomCategory } from "../types";

export const LeftToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    activeConnectorType,
    setActiveConnectorType,
    addElement,
    activeBoard,
  } = useStudio();

  const [isConnectorMenuOpen, setIsConnectorMenuOpen] = useState(false);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);

  const handleCreateRoom = (category: RoomCategory = "public", name = "New Space", area = 50) => {
    addElement({
      type: "room_bubble",
      name,
      category,
      targetAreaM2: area,
      widthM: Math.round(Math.sqrt(area * 1.2) * 10) / 10,
      lengthM: Math.round((area / Math.sqrt(area * 1.2)) * 10) / 10,
      ceilingHeightM: 3.5,
      occupancy: Math.max(2, Math.round(area / 4)),
      daylightReq: category === "public" ? "diffuse_north" : "any",
      acousticLevel: category === "service" ? "loud" : "quiet",
      boardId: activeBoard.id,
      width: 220,
      height: 110,
    });
    setIsRoomMenuOpen(false);
  };

  const handleCreateLevelColumn = () => {
    addElement({
      type: "level_column",
      name: "New Building Level",
      levelNumber: 1,
      elevationM: 3.5,
      maxFootprintM2: 250,
      targetAreaM2: 0,
      roomIds: [],
      boardId: activeBoard.id,
      width: 340,
      height: 520,
      zIndex: 1,
    });
  };

  const handleCreateTracePaper = () => {
    addElement({
      type: "trace_layer",
      title: "Digital Canary Trace (Draft 01)",
      opacity: 0.85,
      tintColor: "yellow_trace",
      sheetSize: "A4_landscape",
      showTapeCorners: true,
      showTitleBlock: true,
      showGrid: false,
      strokes: [],
      boardId: activeBoard.id,
      x: 220,
      y: 140,
      width: 840,
      height: 590,
      zIndex: 0,
    });
  };

  const handleCreatePrecedent = () => {
    addElement({
      type: "precedent_card",
      title: "New Precedent Study",
      architect: "Architect Name",
      location: "City, Country",
      year: new Date().getFullYear() - 5,
      typology: "Civic / Cultural",
      climateZone: "Temperate",
      keyConcepts: ["Structural expression", "Natural ventilation atrium"],
      notes: "Architectural precedent notes and spatial organization reference.",
      boardId: activeBoard.id,
      x: 350,
      y: 200,
      width: 380,
      height: 440,
    });
  };

  const handleCreateSolarCompass = () => {
    addElement({
      type: "solar_compass",
      latitude: 41.4,
      dayOfYear: 172,
      hourOfDay: 12.0,
      northRotationDeg: 0,
      buildingHeightM: 9.0,
      prevailingWindDirDeg: 180,
      windSpeedMps: 3.5,
      boardId: activeBoard.id,
      x: 350,
      y: 200,
      width: 340,
      height: 280,
    });
  };

  const handleCreateNote = () => {
    addElement({
      type: "note_card",
      title: "Design Guidelines & Notes",
      content: "Document key studio jury feedback, egress codes, and material considerations here.",
      colorTheme: "amber",
      checklist: [
        { id: "1", text: "Verify universal accessibility ramps", done: false },
        { id: "2", text: "Ensure dual fire egress paths", done: true },
      ],
      isPinned: false,
      boardId: activeBoard.id,
      x: 350,
      y: 200,
      width: 320,
      height: 320,
    });
  };

  const handleCreateMedia = () => {
    addElement({
      type: "media_card",
      title: "Site Context & Moodboard",
      imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      caption: "Urban context, surrounding building heights, and material references.",
      realWorldScale: "1:200 Context",
      aspectRatio: 1.5,
      boardId: activeBoard.id,
      x: 350,
      y: 200,
      width: 360,
      height: 320,
    });
  };

  return (
    <aside className="w-14 bg-[#151517]/90 backdrop-blur-md border-r border-[#2A2A2E] flex flex-col items-center py-3 z-20 select-none shadow-xl">
      {/* Primary Interaction Tools (Select & Pan) */}
      <div className="flex flex-col gap-1.5 pb-3 border-b border-[#2A2A2E] w-full px-2">
        <button
          onClick={() => setActiveTool("select")}
          title="Select & Move Tool (V)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTool === "select"
              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
              : "text-[#A1A1AA] hover:text-[#E4E4E7] hover:bg-[#222226]"
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool("pan")}
          title="Hand Pan Canvas Tool (H / Space+Drag)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTool === "pan"
              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
              : "text-[#A1A1AA] hover:text-[#E4E4E7] hover:bg-[#222226]"
          }`}
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* [📐 Architectural Dimension Ruler Tool] */}
        <button
          onClick={() => setActiveTool(activeTool === "dimension_ruler" ? "select" : "dimension_ruler")}
          title="Architectural Dimension String & Ruler (R)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTool === "dimension_ruler"
              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
              : "text-[#A1A1AA] hover:text-[#E4E4E7] hover:bg-[#222226]"
          }`}
        >
          <Ruler className="w-4 h-4 text-amber-400" />
        </button>

        {/* [✂️ Section Cut Plane Tool] */}
        <button
          onClick={() => setActiveTool(activeTool === "section_cut" ? "select" : "section_cut")}
          title="Architectural Section Cut Tool (S)"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTool === "section_cut"
              ? "bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
              : "text-[#A1A1AA] hover:text-[#E4E4E7] hover:bg-[#222226]"
          }`}
        >
          <SplitSquareVertical className="w-4 h-4 text-sky-400" />
        </button>
      </div>

      {/* Milanote + Architectural Native Primitives */}
      <div className="flex flex-col gap-2 py-3 border-b border-[#2A2A2E] w-full px-2">
        {/* [📋 Level Column Container] */}
        <button
          onClick={handleCreateLevelColumn}
          title="Add Building Level Column (Floor Container)"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <Columns className="w-4 h-4 text-sky-400" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Level Container Column (L0, L1...)
          </span>
        </button>

        {/* [🟢 Program Bubble / Room Card Menu] */}
        <div className="relative">
          <button
            onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
            title="Add Room Program Card"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105 group ${
              isRoomMenuOpen ? "bg-[#222226] text-amber-400" : "text-[#E4E4E7] hover:text-white hover:bg-[#222226]"
            }`}
          >
            <Square className="w-4 h-4 text-emerald-400" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
              Room / Program Bubble
            </span>
          </button>

          {isRoomMenuOpen && (
            <div className="absolute left-full top-0 ml-2 w-52 bg-[#151517] border border-[#2A2A2E] rounded-lg shadow-2xl p-2 z-50 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#A1A1AA] font-semibold">
                Select Room Category
              </div>
              <button
                onClick={() => handleCreateRoom("public", "Public Hall / Gallery", 100)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 text-blue-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Public Space (100 m²)</span>
              </button>
              <button
                onClick={() => handleCreateRoom("private", "Private Studio / Lab", 60)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 text-purple-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Private / Office (60 m²)</span>
              </button>
              <button
                onClick={() => handleCreateRoom("service", "Workshop / Service", 45)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 text-amber-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Service / Workshop (45 m²)</span>
              </button>
              <button
                onClick={() => handleCreateRoom("cultural", "Auditorium / Lounge", 120)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 text-rose-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Cultural / Gathering (120 m²)</span>
              </button>
              <button
                onClick={() => handleCreateRoom("circulation", "Restroom & Core", 20)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 text-[#E4E4E7]"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                <span>Circulation / Core (20 m²)</span>
              </button>
            </div>
          )}
        </div>

        {/* [✍️ Digital Trace Paper] */}
        <button
          onClick={handleCreateTracePaper}
          title="Add Digital Trace Paper (Drafting Overlay)"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <PenTool className="w-4 h-4 text-amber-300" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Digital Trace Paper (Vellum Layer)
          </span>
        </button>

        {/* [📌 Precedent Card] */}
        <button
          onClick={handleCreatePrecedent}
          title="Add Architectural Precedent Case Study"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Architectural Precedent Card
          </span>
        </button>

        {/* [🧭 Bioclimatic Sun / Ray Tool] */}
        <button
          onClick={handleCreateSolarCompass}
          title="Add Bioclimatic Sun Path & Wind Compass"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Bioclimatic Solar Compass
          </span>
        </button>

        {/* [📝 Rich Note / Checklist] */}
        <button
          onClick={handleCreateNote}
          title="Add Studio Note & Checklist"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <StickyNote className="w-4 h-4 text-amber-300" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Rich Note & Checklist
          </span>
        </button>

        {/* [🖼️ Local Media Dropzone] */}
        <button
          onClick={handleCreateMedia}
          title="Add Image / Moodboard Card"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#E4E4E7] hover:text-white hover:bg-[#222226] transition-all hover:scale-105 group relative"
        >
          <ImageIcon className="w-4 h-4 text-teal-400" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[#151517] border border-[#2A2A2E] text-[#E4E4E7] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
            Image / Moodboard Card
          </span>
        </button>
      </div>

      {/* [🔗 Typed Adjacency Connector Tool] */}
      <div className="py-3 w-full px-2 flex flex-col items-center">
        <div className="relative">
          <button
            onClick={() => {
              if (activeTool === "connector") {
                setActiveTool("select");
              } else {
                setActiveTool("connector");
                setIsConnectorMenuOpen(true);
              }
            }}
            title="Connect Rooms (Typed Adjacencies)"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              activeTool === "connector"
                ? "bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-[#A1A1AA] hover:text-[#E4E4E7] hover:bg-[#222226]"
            }`}
          >
            <Link2 className="w-4 h-4" />
          </button>

          {isConnectorMenuOpen && (
            <div className="absolute left-full top-0 ml-2 w-56 bg-[#151517] border border-[#2A2A2E] rounded-lg shadow-2xl p-2 z-50 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#A1A1AA] font-semibold">
                Adjacency Connector Type
              </div>
              <button
                onClick={() => {
                  setActiveConnectorType("direct_access");
                  setActiveTool("connector");
                  setIsConnectorMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 ${
                  activeConnectorType === "direct_access" ? "bg-emerald-950/60 text-emerald-300 font-semibold" : "text-[#E4E4E7]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>🟢 Direct Access (Door/Flow)</span>
              </button>
              <button
                onClick={() => {
                  setActiveConnectorType("visual_link");
                  setActiveTool("connector");
                  setIsConnectorMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 ${
                  activeConnectorType === "visual_link" ? "bg-blue-950/60 text-blue-300 font-semibold" : "text-[#E4E4E7]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>🔵 Visual Link (Glazing)</span>
              </button>
              <button
                onClick={() => {
                  setActiveConnectorType("acoustic_conflict");
                  setActiveTool("connector");
                  setIsConnectorMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 ${
                  activeConnectorType === "acoustic_conflict" ? "bg-red-950/60 text-red-300 font-semibold" : "text-[#E4E4E7]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>🔴 Acoustic Conflict Buffer</span>
              </button>
              <button
                onClick={() => {
                  setActiveConnectorType("service_link");
                  setActiveTool("connector");
                  setIsConnectorMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-[#222226] flex items-center gap-2 ${
                  activeConnectorType === "service_link" ? "bg-amber-950/60 text-amber-300 font-semibold" : "text-[#E4E4E7]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span>🟡 Service / Utility Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
