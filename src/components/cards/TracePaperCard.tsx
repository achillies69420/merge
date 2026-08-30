import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  PenTool,
  Highlighter,
  Eraser,
  Trash2,
  Sliders,
  Layers,
  Palette,
  Eye,
  EyeOff,
  Printer,
  Download,
  RotateCcw,
  RotateCw,
  Compass,
  Grid,
  Maximize2,
  FileText,
  Spline,
  Move,
} from "lucide-react";
import { TraceLayerElement, DrawingStroke, StrokePoint } from "../../types";
import { useStudio } from "../../context/StudioContext";

interface TracePaperCardProps {
  element: TraceLayerElement;
  isSelected: boolean;
}

// Authentic architectural paper backgrounds & textures
const PAPER_STYLES: Record<
  string,
  {
    bgClass: string;
    borderClass: string;
    name: string;
    pattern?: string;
    textColor: string;
  }
> = {
  yellow_trace: {
    name: "Canary Yellow Trace",
    bgClass: "bg-[#fef3c7]/80 backdrop-blur-[1px]",
    borderClass: "border-[#f59e0b]/40 shadow-xl",
    textColor: "text-amber-950",
  },
  white_vellum: {
    name: "White Drafting Vellum",
    bgClass: "bg-white/85 backdrop-blur-[2px]",
    borderClass: "border-neutral-300 shadow-xl",
    textColor: "text-neutral-900",
  },
  blue_grid: {
    name: "Blueprint Millimeter Grid",
    bgClass: "bg-[#f0f9ff]/90",
    borderClass: "border-sky-300 shadow-xl",
    textColor: "text-sky-950",
  },
  dot_grid: {
    name: "Architectural Dot Matrix",
    bgClass: "bg-[#fafaf9]/90",
    borderClass: "border-neutral-300 shadow-xl",
    textColor: "text-neutral-900",
  },
  kraft_paper: {
    name: "Kraft Drafting Paper",
    bgClass: "bg-[#f5ebd7]/90",
    borderClass: "border-[#d4be98] shadow-xl",
    textColor: "text-[#4a3b2c]",
  },
  clear: {
    name: "Clear Glass Overlay",
    bgClass: "bg-transparent backdrop-blur-[1px]",
    borderClass: "border-neutral-600/60 shadow-lg",
    textColor: "text-neutral-200",
  },
};

const SHEET_SIZE_PRESETS = [
  { id: "A4_landscape", name: "A4 Sheet (840 × 590)", width: 840, height: 590 },
  { id: "A3_landscape", name: "A3 Sheet (1160 × 820)", width: 1160, height: 820 },
  { id: "tabloid", name: "Tabloid 11×17 (980 × 620)", width: 980, height: 620 },
  { id: "roll", name: "Wide Trace Roll (1300 × 750)", width: 1300, height: 750 },
  { id: "square", name: "Square Study (700 × 700)", width: 700, height: 700 },
];

export const TracePaperCard: React.FC<TracePaperCardProps> = ({ element, isSelected }) => {
  const { updateElement, removeElement, project } = useStudio();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeDrawingTool, setActiveDrawingTool] = useState<
    "pen" | "felt" | "highlighter" | "pencil" | "eraser"
  >("felt");
  const [strokeColor, setStrokeColor] = useState<string>("#18181b");
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [opacity, setOpacity] = useState<number>(element.opacity ?? 0.85);
  const [tint, setTint] = useState<string>(element.tintColor ?? "yellow_trace");
  const [showTapeCorners, setShowTapeCorners] = useState<boolean>(element.showTapeCorners ?? true);
  const [showTitleBlock, setShowTitleBlock] = useState<boolean>(element.showTitleBlock ?? true);
  const [showGrid, setShowGrid] = useState<boolean>(element.showGrid ?? false);
  const [isStraightLineMode, setIsStraightLineMode] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);

  const activePointerIdRef = useRef<number | null>(null);
  const startPointRef = useRef<StrokePoint | null>(null);

  // Precise Canvas Coordinate Converter (Fixes Zoom, Pan, and CSS transform offsets)
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale factors between screen pixels and internal bitmap pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;

    // Shift key or Straight Line mode: lock orthogonal / 45° angle
    if ((e.shiftKey || isStraightLineMode) && startPointRef.current) {
      const sx = startPointRef.current.x;
      const sy = startPointRef.current.y;
      const dx = Math.abs(x - sx);
      const dy = Math.abs(y - sy);

      if (dx > dy * 1.6) {
        y = sy; // Pure horizontal
      } else if (dy > dx * 1.6) {
        x = sx; // Pure vertical
      } else {
        // 45 degree diagonal lock
        const signX = x >= sx ? 1 : -1;
        const signY = y >= sy ? 1 : -1;
        const maxDist = Math.max(dx, dy);
        x = sx + signX * maxDist;
        y = sy + signY * maxDist;
      }
    }

    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }, [isStraightLineMode]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    (element.strokes || []).forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1.0;
      } else if (stroke.tool === "highlighter") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = stroke.opacity || 0.35;
      } else if (stroke.tool === "pencil") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.8;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = stroke.opacity || 0.95;
      }

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.fillStyle = stroke.color;
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Smooth spline drawing through points
        for (let i = 1; i < stroke.points.length; i++) {
          const p1 = stroke.points[i - 1];
          const p2 = stroke.points[i];
          const pressureVal = p2.pressure ?? 0.5;
          let dynamicWidth = stroke.size;

          if (stroke.tool === "pen") {
            dynamicWidth = Math.max(1, stroke.size * (pressureVal > 0 ? pressureVal * 1.3 : 1));
          } else if (stroke.tool === "highlighter") {
            dynamicWidth = stroke.size;
          } else if (stroke.tool === "pencil") {
            dynamicWidth = Math.max(1, stroke.size * (pressureVal > 0 ? 0.7 + pressureVal * 0.6 : 1));
          } else if (stroke.tool === "felt") {
            dynamicWidth = Math.max(1.5, stroke.size * (pressureVal > 0 ? 0.8 + pressureVal * 0.8 : 1));
          }

          ctx.lineWidth = dynamicWidth;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }, [element.strokes, element.width, element.height]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Pointer Down (Stylus, Touch, Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();

    // Hardware eraser detection
    const isHardwareEraser =
      e.pointerType === "eraser" || e.buttons === 32 || (e as any).button === 5;
    const effectiveTool = isHardwareEraser ? "eraser" : activeDrawingTool;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}

    activePointerIdRef.current = e.pointerId;

    const coords = getCanvasCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const firstPoint: StrokePoint = { x: coords.x, y: coords.y, pressure };

    startPointRef.current = firstPoint;
    setIsDrawing(true);
    setCurrentPoints([firstPoint]);

    // Save history state for Undo
    setUndoStack((prev) => [...prev, element.strokes || []]);
    setRedoStack([]);
  };

  // Pointer Move (Zero-offset live tracing)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || e.pointerId !== activePointerIdRef.current) return;
    e.stopPropagation();

    const coords = getCanvasCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const isHardwareEraser =
      e.pointerType === "eraser" || e.buttons === 32 || (e as any).button === 5;
    const effectiveTool = isHardwareEraser ? "eraser" : activeDrawingTool;

    const nextPoints = [...currentPoints, { x: coords.x, y: coords.y, pressure }];
    setCurrentPoints(nextPoints);

    // Live render current stroke segment onto canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (effectiveTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = "#000000";
    } else if (effectiveTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = strokeColor;
    } else if (effectiveTool === "pencil") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = strokeColor;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = strokeColor;
    }

    if (nextPoints.length >= 2) {
      const p1 = nextPoints[nextPoints.length - 2];
      const p2 = nextPoints[nextPoints.length - 1];
      const dynamicWidth =
        effectiveTool === "highlighter"
          ? strokeSize
          : Math.max(1, strokeSize * (pressure > 0 ? pressure * 1.4 : 1));
      ctx.lineWidth = dynamicWidth;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setIsDrawing(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    activePointerIdRef.current = null;
    startPointRef.current = null;

    const isHardwareEraser =
      e.pointerType === "eraser" || e.buttons === 32 || (e as any).button === 5;
    const effectiveTool = isHardwareEraser ? "eraser" : activeDrawingTool;

    if (currentPoints.length >= 1) {
      const newStroke: DrawingStroke = {
        id: `strk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tool: effectiveTool,
        color: effectiveTool === "eraser" ? "#000000" : strokeColor,
        size: strokeSize,
        points: currentPoints,
        opacity:
          effectiveTool === "highlighter"
            ? 0.35
            : effectiveTool === "pencil"
            ? 0.8
            : 0.95,
      };

      const updatedStrokes = [...(element.strokes || []), newStroke];
      updateElement(element.id, { strokes: updatedStrokes });
    }
    setCurrentPoints([]);
  };

  // Undo & Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, element.strokes || []]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    updateElement(element.id, { strokes: previousStrokes });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, element.strokes || []]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    updateElement(element.id, { strokes: nextStrokes });
  };

  // Clear Canvas
  const handleClear = () => {
    if (confirm("Clear all drawing strokes on this trace paper?")) {
      setUndoStack((prev) => [...prev, element.strokes || []]);
      setRedoStack([]);
      updateElement(element.id, { strokes: [] });
    }
  };

  // Print Sheet / High-Res Paper Export
  const handlePrintSheet = () => {
    // Generate a dedicated standalone printable paper window
    const canvas = canvasRef.current;
    if (!canvas) return;

    const printWin = window.open("", "_blank", "width=1200,height=850");
    if (!printWin) {
      // Fallback to standard window print
      window.print();
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const paperBg =
      tint === "yellow_trace"
        ? "#fef3c7"
        : tint === "blue_grid"
        ? "#f0f9ff"
        : tint === "kraft_paper"
        ? "#f5ebd7"
        : "#ffffff";

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${element.title} - Architectural Drawing Sheet</title>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 20px;
              background-color: #f4f4f5;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .paper-sheet {
              width: ${element.width}px;
              height: ${element.height}px;
              background-color: ${paperBg};
              border: 2px solid #333333;
              position: relative;
              box-sizing: border-box;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .drawing-canvas-img {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }
            .title-block {
              position: absolute;
              bottom: 16px;
              right: 16px;
              background: rgba(255, 255, 255, 0.95);
              border: 1.5px solid #18181b;
              padding: 8px 12px;
              font-size: 11px;
              min-width: 240px;
              box-sizing: border-box;
              color: #18181b;
            }
            .title-header {
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-size: 12px;
              border-bottom: 1px solid #18181b;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .scale-bar {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-top: 4px;
              font-size: 9px;
              font-family: monospace;
            }
            .bar {
              display: flex;
              height: 4px;
              width: 100px;
              border: 1px solid #000;
            }
            .bar-seg {
              flex: 1;
            }
            .bar-seg:nth-child(odd) {
              background: #000;
            }
            @media print {
              body {
                background: #ffffff !important;
                padding: 0;
              }
              .paper-sheet {
                box-shadow: none !important;
                border: 1.5px solid #000000 !important;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="paper-sheet">
            <img class="drawing-canvas-img" src="${dataUrl}" alt="Architectural Trace Drawing" />
            <div class="title-block">
              <div class="title-header">${project.name || "ARCHITECTURAL DESIGN STUDIO"}</div>
              <div><strong>Sheet:</strong> ${element.title}</div>
              <div><strong>Author:</strong> ${project.studentName || "Studio Architect"} | ${new Date().toLocaleDateString()}</div>
              <div class="scale-bar">
                <span>SCALE ${project.scale || "1:100"}:</span>
                <div class="bar">
                  <div class="bar-seg"></div>
                  <div class="bar-seg"></div>
                  <div class="bar-seg"></div>
                  <div class="bar-seg"></div>
                </div>
                <span>0 — 5m</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Download High-Resolution PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create composite canvas with paper background and title block
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    // Draw Paper background
    if (tint === "yellow_trace") {
      expCtx.fillStyle = "#fef3c7";
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (tint === "blue_grid") {
      expCtx.fillStyle = "#f0f9ff";
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      // Draw grid
      expCtx.strokeStyle = "#bae6fd";
      expCtx.lineWidth = 1;
      for (let x = 0; x < exportCanvas.width; x += 40) {
        expCtx.beginPath();
        expCtx.moveTo(x, 0);
        expCtx.lineTo(x, exportCanvas.height);
        expCtx.stroke();
      }
      for (let y = 0; y < exportCanvas.height; y += 40) {
        expCtx.beginPath();
        expCtx.moveTo(0, y);
        expCtx.lineTo(exportCanvas.width, y);
        expCtx.stroke();
      }
    } else if (tint === "kraft_paper") {
      expCtx.fillStyle = "#f5ebd7";
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (tint === "white_vellum") {
      expCtx.fillStyle = "#ffffff";
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Draw ink strokes
    expCtx.drawImage(canvas, 0, 0);

    // Draw Title Stamp in corner
    if (showTitleBlock) {
      const stampW = 260;
      const stampH = 70;
      const stampX = exportCanvas.width - stampW - 20;
      const stampY = exportCanvas.height - stampH - 20;

      expCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
      expCtx.strokeStyle = "#18181b";
      expCtx.lineWidth = 2;
      expCtx.fillRect(stampX, stampY, stampW, stampH);
      expCtx.strokeRect(stampX, stampY, stampW, stampH);

      expCtx.fillStyle = "#18181b";
      expCtx.font = "bold 12px sans-serif";
      expCtx.fillText(project.name.toUpperCase(), stampX + 10, stampY + 20);

      expCtx.font = "10px sans-serif";
      expCtx.fillText(`${element.title} • ${project.scale || "1:100"}`, stampX + 10, stampY + 40);
      expCtx.fillText(`Author: ${project.studentName || "Studio Author"} | ${new Date().toLocaleDateString()}`, stampX + 10, stampY + 58);
    }

    const link = document.createElement("a");
    link.download = `${element.title.toLowerCase().replace(/\s+/g, "_")}_drawing.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  // Resize handler
  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = element.width;
    const startH = element.height;

    const onMove = (moveEvent: PointerEvent) => {
      const dw = moveEvent.clientX - startX;
      const dh = moveEvent.clientY - startY;
      const newW = Math.max(400, Math.min(2400, Math.round(startW + dw)));
      const newH = Math.max(300, Math.min(1800, Math.round(startH + dh)));
      updateElement(element.id, { width: newW, height: newH });
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const currentPaper = PAPER_STYLES[tint] || PAPER_STYLES.yellow_trace;

  return (
    <div
      className={`relative rounded-sm border transition-all select-none flex flex-col group ${
        currentPaper.bgClass
      } ${currentPaper.borderClass} ${
        isSelected
          ? "ring-2 ring-amber-500/70 shadow-2xl"
          : "hover:shadow-2xl"
      }`}
      style={{
        width: `${element.width}px`,
        height: `${element.height}px`,
        opacity: opacity,
      }}
    >
      {/* Authentic Corner Drafting Masking Tape Strips */}
      {showTapeCorners && (
        <>
          {/* Top-Left Corner Tape */}
          <div
            className="absolute -top-3.5 -left-4 w-12 h-5 bg-[#E8DFC8]/90 border border-[#D5C7A3]/70 -rotate-45 shadow-sm pointer-events-none z-30 opacity-90 rounded-[1px]"
            style={{
              backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%)",
            }}
          />
          {/* Top-Right Corner Tape */}
          <div
            className="absolute -top-3.5 -right-4 w-12 h-5 bg-[#E8DFC8]/90 border border-[#D5C7A3]/70 rotate-45 shadow-sm pointer-events-none z-30 opacity-90 rounded-[1px]"
            style={{
              backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%)",
            }}
          />
          {/* Bottom-Left Corner Tape */}
          <div
            className="absolute -bottom-3.5 -left-4 w-12 h-5 bg-[#E8DFC8]/90 border border-[#D5C7A3]/70 rotate-45 shadow-sm pointer-events-none z-30 opacity-90 rounded-[1px]"
            style={{
              backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%)",
            }}
          />
          {/* Bottom-Right Corner Tape */}
          <div
            className="absolute -bottom-3.5 -right-4 w-12 h-5 bg-[#E8DFC8]/90 border border-[#D5C7A3]/70 -rotate-45 shadow-sm pointer-events-none z-30 opacity-90 rounded-[1px]"
            style={{
              backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%)",
            }}
          />
        </>
      )}

      {/* Grid Pattern Overlay if enabled */}
      {(showGrid || tint === "blue_grid" || tint === "dot_grid") && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-40"
          style={{
            backgroundImage:
              tint === "dot_grid"
                ? "radial-gradient(#71717a 1px, transparent 1px)"
                : "linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)",
            backgroundSize: tint === "dot_grid" ? "20px 20px" : "40px 40px",
          }}
        />
      )}

      {/* Top Floating Drafting & Inking Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 bg-[#0F0F11]/95 backdrop-blur-md rounded-xl border border-[#2A2A2E] z-30 text-xs shadow-2xl text-[#E4E4E7]"
      >
        {/* Left Section: Title & Drawing Tools */}
        <div className="flex items-center gap-2">
          {/* Title Header */}
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-[#2A2A2E]">
            <PenTool className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="text"
              value={element.title}
              onChange={(e) => updateElement(element.id, { title: e.target.value })}
              className="bg-transparent font-mono text-[11px] font-bold text-[#E4E4E7] outline-none max-w-[130px] hover:bg-[#18181B] px-1 rounded"
              title="Click to rename trace sheet"
            />
          </div>

          {/* Architectural Drawing Tools */}
          <div className="flex items-center gap-0.5 bg-[#18181B] p-0.5 rounded-lg border border-[#2A2A2E]">
            <button
              onClick={() => {
                setActiveDrawingTool("pen");
                setStrokeSize(2);
              }}
              title="0.3mm Fine Drafting Pen"
              className={`px-1.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                activeDrawingTool === "pen"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Pen</span>
            </button>

            <button
              onClick={() => {
                setActiveDrawingTool("felt");
                setStrokeSize(4);
              }}
              title="Architectural Felt Tip Marker (4px)"
              className={`px-1.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                activeDrawingTool === "felt"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
              }`}
            >
              <Spline className="w-3 h-3" />
              <span>Felt</span>
            </button>

            <button
              onClick={() => {
                setActiveDrawingTool("highlighter");
                setStrokeSize(18);
              }}
              title="Chisel Trace Highlighter (18px)"
              className={`px-1.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                activeDrawingTool === "highlighter"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
              }`}
            >
              <Highlighter className="w-3 h-3" />
              <span>Marker</span>
            </button>

            <button
              onClick={() => {
                setActiveDrawingTool("pencil");
                setStrokeSize(2);
              }}
              title="2B Graphite Drafting Pencil"
              className={`px-1.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                activeDrawingTool === "pencil"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
              }`}
            >
              <span>2B</span>
            </button>

            <button
              onClick={() => {
                setActiveDrawingTool("eraser");
                setStrokeSize(24);
              }}
              title="Eraser Tool"
              className={`p-1 rounded transition-all ${
                activeDrawingTool === "eraser"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "text-[#A1A1AA] hover:text-white hover:bg-[#222226]"
              }`}
            >
              <Eraser className="w-3 h-3" />
            </button>
          </div>

          {/* Stroke Size Slider */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA] pl-1">
            <span>{strokeSize}px</span>
            <input
              type="range"
              min="1"
              max="32"
              value={strokeSize}
              onChange={(e) => setStrokeSize(Number(e.target.value))}
              className="w-12 h-1 bg-[#222226] rounded accent-amber-500 cursor-pointer"
              title="Stroke width"
            />
          </div>

          {/* Color Swatches */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#2A2A2E]">
            {[
              { color: "#18181b", label: "Black Ink" },
              { color: "#f59e0b", label: "Studio Amber" },
              { color: "#0284c7", label: "Architectural Cyan" },
              { color: "#10b981", label: "Landscape Green" },
              { color: "#ef4444", label: "Axis Red" },
              { color: "#8b5cf6", label: "Program Purple" },
              { color: "#ffffff", label: "White Gouache" },
            ].map(({ color, label }) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                title={label}
                style={{ backgroundColor: color }}
                className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                  strokeColor === color
                    ? "border-white ring-2 ring-amber-400 scale-125 z-10"
                    : "border-[#3f3f46] hover:scale-110"
                }`}
              />
            ))}
          </div>

          {/* Ortho / Straight-line snap */}
          <button
            onClick={() => setIsStraightLineMode(!isStraightLineMode)}
            title="Ortho Straight-Line Mode (or hold Shift)"
            className={`px-1.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 border transition-all ${
              isStraightLineMode
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold"
                : "border-[#2A2A2E] text-[#A1A1AA] hover:text-white"
            }`}
          >
            <span>Ortho</span>
          </button>
        </div>

        {/* Right Section: Paper Styling, Undo/Redo, Print & Export */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-[#2A2A2E]">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:hover:text-[#A1A1AA]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
              className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:hover:text-[#A1A1AA]"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          {/* Paper Type Selector */}
          <select
            value={tint}
            onChange={(e) => {
              const val = e.target.value as any;
              setTint(val);
              updateElement(element.id, { tintColor: val });
            }}
            className="bg-[#18181B] text-[10px] px-2 py-1 rounded-md border border-[#2A2A2E] text-[#E4E4E7] font-mono outline-none cursor-pointer"
            title="Select Architectural Paper Finish"
          >
            <option value="yellow_trace">🟡 Canary Yellow Trace</option>
            <option value="white_vellum">⚪ White Drafting Vellum</option>
            <option value="blue_grid">🔵 Blueprint Millimeter Grid</option>
            <option value="dot_grid">⚪ Dot Matrix Paper</option>
            <option value="kraft_paper">🟤 Kraft Sketch Paper</option>
            <option value="clear">🔲 Clear Glass Film</option>
          </select>

          {/* Sheet Size Selector */}
          <select
            onChange={(e) => {
              const preset = SHEET_SIZE_PRESETS.find((p) => p.id === e.target.value);
              if (preset) {
                updateElement(element.id, {
                  width: preset.width,
                  height: preset.height,
                  sheetSize: preset.id as any,
                });
              }
            }}
            defaultValue=""
            className="bg-[#18181B] text-[10px] px-2 py-1 rounded-md border border-[#2A2A2E] text-[#E4E4E7] font-mono outline-none cursor-pointer"
            title="Standard Paper Sizes"
          >
            <option value="" disabled>
              📐 Sheet Size
            </option>
            {SHEET_SIZE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Opacity slider */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA] px-1 border-l border-[#2A2A2E]">
            <span>{Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min="0.15"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => {
                const val = Number(e.target.value);
                setOpacity(val);
                updateElement(element.id, { opacity: val });
              }}
              className="w-10 h-1 bg-[#222226] rounded accent-amber-500 cursor-pointer"
              title="Trace Paper Transparency"
            />
          </div>

          {/* Print & Export Actions */}
          <button
            onClick={handlePrintSheet}
            title="Print Drawing Sheet (PDF)"
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-md text-[10px] font-mono shadow transition-all active:scale-95 ml-1"
          >
            <Printer className="w-3 h-3" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            title="Download High-Res 300DPI PNG"
            className="p-1 text-[#A1A1AA] hover:text-white hover:bg-[#222226] rounded transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            onClick={handleClear}
            title="Clear all strokes"
            className="p-1 text-[#A1A1AA] hover:text-amber-400 hover:bg-[#222226] rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <button
            onClick={() => removeElement(element.id)}
            title="Remove Trace Layer"
            className="p-1 text-[#A1A1AA] hover:text-red-400 hover:bg-[#222226] rounded transition-colors"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* HTML5 Canvas Drawing Surface (Mathematical Pixel Mapping) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          width={element.width}
          height={element.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
          className="w-full h-full cursor-crosshair relative z-10 select-none block"
        />

        {/* Architectural Title Block & Scale Stamp in bottom-right corner */}
        {showTitleBlock && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 bg-white/95 border-2 border-neutral-900 shadow-md p-2 text-neutral-900 rounded-[2px] z-20 pointer-events-auto select-none min-w-[220px]"
          >
            <div className="text-[10px] font-black tracking-wider uppercase border-b border-neutral-900 pb-1 mb-1 flex items-center justify-between">
              <span>{project.name || "DESIGN STUDIO"}</span>
              <span className="text-[8px] font-mono px-1 bg-neutral-900 text-white rounded-[1px]">
                {element.sheetSize?.toUpperCase() || "A4"}
              </span>
            </div>
            <div className="text-[9px] font-bold text-neutral-800 truncate">
              {element.title}
            </div>
            <div className="flex items-center justify-between text-[8px] font-mono text-neutral-600 mt-1">
              <span>SCALE {project.scale || "1:100"}</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            {/* Scale Graphic Bar */}
            <div className="flex items-center gap-1 mt-1">
              <div className="flex h-1.5 w-24 border border-neutral-900">
                <div className="w-6 bg-neutral-900" />
                <div className="w-6 bg-white" />
                <div className="w-6 bg-neutral-900" />
                <div className="w-6 bg-white" />
              </div>
              <span className="text-[7px] font-mono font-bold text-neutral-800">0 — 5m</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Bottom-Right Corner Resize Grip */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center z-30 text-[#71717a] hover:text-amber-400 bg-neutral-900/40 rounded-tl-md transition-colors"
        title="Drag to resize trace paper sheet"
      >
        <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-current" />
      </div>
    </div>
  );
};
