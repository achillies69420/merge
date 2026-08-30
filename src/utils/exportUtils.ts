import {
  CanvasElement,
  ConnectorLink,
  ProjectMetadata,
  ArchitecturalMetrics,
  RoomElement,
  LevelColumnElement,
} from "../types";

export function exportAreaScheduleCSV(
  elements: CanvasElement[],
  project: ProjectMetadata,
  metrics: ArchitecturalMetrics
): void {
  const rooms = elements.filter((el): el is RoomElement => el.type === "room_bubble");
  const levels = elements.filter((el): el is LevelColumnElement => el.type === "level_column");

  const levelMap = new Map<string, string>();
  levels.forEach((l) => levelMap.set(l.id, l.name));

  const headers = [
    "Room ID",
    "Space / Room Name",
    "Building Level",
    "Category",
    "Target Area (m²)",
    "Width (m)",
    "Length (m)",
    "Daylight Req",
    "Acoustic Level",
    "Target Occupancy",
    "Notes",
  ];

  const rows = rooms.map((r) => [
    `"${r.id}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${(r.parentColumnId ? levelMap.get(r.parentColumnId) || "Unassigned" : "Unassigned").replace(/"/g, '""')}"`,
    `"${r.category}"`,
    r.targetAreaM2.toFixed(2),
    r.widthM.toFixed(2),
    r.lengthM.toFixed(2),
    `"${r.daylightReq}"`,
    `"${r.acousticLevel}"`,
    r.occupancy || "-",
    `"${(r.notes || "").replace(/"/g, '""')}"`,
  ]);

  // Append Project & Zoning Summary Lines
  const summaryLines = [
    "",
    "--- ARCHITECTURAL METRICS & ZONING COMPLIANCE ---",
    `Project Name,"${project.name.replace(/"/g, '""')}"`,
    `Scale Ratio,"${project.scale}"`,
    `Typology,"${project.typology}"`,
    `Plot / Site Area,"${project.plotAreaM2} m²"`,
    `Net Usable Area (NUA),"${metrics.totalNetAreaM2} m²"`,
    `Circulation Multiplier,"${project.circulationFactor}x"`,
    `Gross Floor Area (GFA),"${metrics.totalGfaM2} m²"`,
    `Ground Floor Footprint,"${metrics.groundFloorFootprintM2} m²"`,
    `Ground Coverage (CES),"${metrics.cesPercent}% (Max allowed: ${project.maxCESPercent}%)"`,
    `Floor Area Ratio (COS/FAR),"${metrics.cosRatio} (Max allowed: ${project.maxCOS})"`,
    `Zoning Status,"${metrics.cesStatus === "valid" && metrics.cosStatus === "valid" ? "PASSED" : "COMPLIANCE WARNING"}"`,
    `Exported Date,"${new Date().toISOString()}"`,
  ];

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(",")), ...summaryLines].join(
    "\n"
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${project.name.toLowerCase().replace(/\s+/g, "_")}_area_schedule.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBoardSVG(
  elements: CanvasElement[],
  connectors: ConnectorLink[],
  project: ProjectMetadata,
  activeBoardName: string
): void {
  if (elements.length === 0) return;

  // Calculate bounding box of all elements
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });

  const padding = 80;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = maxX - minX + padding * 2;
  const viewBoxH = maxY - minY + padding * 2;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="${viewBoxW}" height="${viewBoxH}" style="background-color: #0a0a0a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" stroke-width="0.5"/>
      </pattern>
      <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981"/>
      </marker>
      <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6"/>
      </marker>
    </defs>
    <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="#0d1117" />
    <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="url(#grid)" />
    
    <!-- Title Sheet Header -->
    <g transform="translate(${viewBoxX + 30}, ${viewBoxY + 40})">
      <text fill="#ffffff" font-size="22" font-weight="bold">${project.name} — ${activeBoardName}</text>
      <text fill="#9ca3af" font-size="12" y="24">Scale ${project.scale} | Typology: ${project.typology} | Generated via ArchiCanvas Studio</text>
    </g>
  `;

  // Draw Connectors
  connectors.forEach((conn) => {
    const src = elements.find((e) => e.id === conn.sourceId);
    const tgt = elements.find((e) => e.id === conn.targetId);
    if (!src || !tgt) return;

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height / 2;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y + tgt.height / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx1 = x1 + dx * 0.4;
    const cy1 = y1;
    const cx2 = x1 + dx * 0.6;
    const cy2 = y2;

    let strokeColor = "#10b981";
    let strokeDash = "none";
    let strokeWidth = "2.5";

    if (conn.type === "visual_link") {
      strokeColor = "#3b82f6";
      strokeDash = "6,4";
      strokeWidth = "2";
    } else if (conn.type === "acoustic_conflict") {
      strokeColor = "#ef4444";
      strokeDash = "3,3";
      strokeWidth = "2.5";
    } else if (conn.type === "service_link") {
      strokeColor = "#f59e0b";
      strokeDash = "8,3";
      strokeWidth = "2";
    }

    svgContent += `
      <path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" opacity="0.85"/>
      ${conn.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" fill="${strokeColor}" font-size="11" text-anchor="middle">${conn.label}</text>` : ""}
    `;
  });

  // Draw Elements
  elements.forEach((el) => {
    if (el.type === "level_column") {
      const col = el as LevelColumnElement;
      svgContent += `
        <g transform="translate(${col.x}, ${col.y})">
          <rect width="${col.width}" height="${col.height}" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.5"/>
          <rect width="${col.width}" height="42" rx="8" fill="#21262d"/>
          <text x="14" y="26" fill="#f0f6fc" font-size="13" font-weight="600">${col.name}</text>
          <text x="${col.width - 14}" y="26" fill="#8b949e" font-size="11" text-anchor="end">+${col.elevationM.toFixed(1)}m</text>
        </g>
      `;
    } else if (el.type === "room_bubble") {
      const room = el as RoomElement;
      let catBg = "#1f242c";
      let catBorder = "#4b5563";
      if (room.category === "public") {
        catBg = "#132338";
        catBorder = "#3b82f6";
      } else if (room.category === "private") {
        catBg = "#271d33";
        catBorder = "#a855f7";
      } else if (room.category === "service") {
        catBg = "#262118";
        catBorder = "#f59e0b";
      } else if (room.category === "outdoor") {
        catBg = "#132b22";
        catBorder = "#10b981";
      }

      svgContent += `
        <g transform="translate(${room.x}, ${room.y})">
          <rect width="${room.width}" height="${room.height}" rx="6" fill="${catBg}" stroke="${catBorder}" stroke-width="1.5"/>
          <text x="12" y="24" fill="#ffffff" font-size="13" font-weight="600">${room.name}</text>
          <text x="12" y="44" fill="#9ca3af" font-size="11">${room.targetAreaM2} m² (${room.widthM}m × ${room.lengthM}m)</text>
          <text x="12" y="62" fill="#d1d5db" font-size="10">Daylight: ${room.daylightReq} | Sound: ${room.acousticLevel}</text>
        </g>
      `;
    } else if (el.type === "note_card") {
      svgContent += `
        <g transform="translate(${el.x}, ${el.y})">
          <rect width="${el.width}" height="${el.height}" rx="6" fill="#1c1e24" stroke="#374151" stroke-width="1"/>
          <text x="12" y="22" fill="#f3f4f6" font-size="12" font-weight="bold">${(el as any).title}</text>
        </g>
      `;
    }
  });

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${project.name.toLowerCase().replace(/\s+/g, "_")}_${activeBoardName.toLowerCase().replace(/\s+/g, "_")}.svg`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
