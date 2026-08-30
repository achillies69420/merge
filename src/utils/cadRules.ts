import {
  CanvasElement,
  ConnectorLink,
  ProjectMetadata,
  ArchitecturalMetrics,
  SpatialRuleIssue,
  RoomElement,
  LevelColumnElement,
} from "../types";

export function computeArchitecturalMetrics(
  elements: CanvasElement[],
  project: ProjectMetadata
): ArchitecturalMetrics {
  const rooms = elements.filter((el): el is RoomElement => el.type === "room_bubble");
  const levels = elements.filter((el): el is LevelColumnElement => el.type === "level_column");

  const totalNetAreaM2 = rooms.reduce((sum, r) => sum + (r.targetAreaM2 || 0), 0);
  const totalGfaM2 = Math.round(totalNetAreaM2 * (project.circulationFactor || 1.15) * 10) / 10;

  // Ground Floor footprint calculation:
  // Check if there is an explicit ground floor level (levelNumber === 0 or isGroundFloor)
  const groundFloor = levels.find((l) => l.isGroundFloor || l.levelNumber === 0);
  let groundFloorFootprintM2 = 0;

  if (groundFloor) {
    const groundRooms = rooms.filter((r) => r.parentColumnId === groundFloor.id);
    groundFloorFootprintM2 = groundRooms.reduce((sum, r) => sum + (r.targetAreaM2 || 0), 0);
  } else if (levels.length > 0) {
    // If no explicit ground level, take the lowest elevation level
    const lowestLevel = [...levels].sort((a, b) => a.elevationM - b.elevationM)[0];
    const groundRooms = rooms.filter((r) => r.parentColumnId === lowestLevel.id);
    groundFloorFootprintM2 = groundRooms.reduce((sum, r) => sum + (r.targetAreaM2 || 0), 0);
  } else {
    // Fallback: estimate ground footprint as ~45% of net area
    groundFloorFootprintM2 = Math.round(totalNetAreaM2 * 0.45 * 10) / 10;
  }

  const plotArea = Math.max(1, project.plotAreaM2 || 500);
  const cesPercent = Math.round((groundFloorFootprintM2 / plotArea) * 1000) / 10;
  const cosRatio = Math.round((totalGfaM2 / plotArea) * 100) / 100;

  let cesStatus: "valid" | "warning" | "exceeded" = "valid";
  if (cesPercent > (project.maxCESPercent || 50)) {
    cesStatus = "exceeded";
  } else if (cesPercent > (project.maxCESPercent || 50) * 0.9) {
    cesStatus = "warning";
  }

  let cosStatus: "valid" | "warning" | "exceeded" = "valid";
  if (cosRatio > (project.maxCOS || 1.5)) {
    cosStatus = "exceeded";
  } else if (cosRatio > (project.maxCOS || 1.5) * 0.9) {
    cosStatus = "warning";
  }

  return {
    totalNetAreaM2: Math.round(totalNetAreaM2 * 10) / 10,
    totalGfaM2,
    groundFloorFootprintM2: Math.round(groundFloorFootprintM2 * 10) / 10,
    cesPercent,
    cosRatio,
    cesStatus,
    cosStatus,
    roomCount: rooms.length,
    levelCount: levels.length,
  };
}

export function runOfflineCadRuleChecker(
  elements: CanvasElement[],
  connectors: ConnectorLink[],
  project: ProjectMetadata
): SpatialRuleIssue[] {
  const issues: SpatialRuleIssue[] = [];
  const rooms = elements.filter((el): el is RoomElement => el.type === "room_bubble");
  const levels = elements.filter((el): el is LevelColumnElement => el.type === "level_column");
  const metrics = computeArchitecturalMetrics(elements, project);

  // 1. Zoning CES Limit
  if (metrics.cesStatus === "exceeded") {
    issues.push({
      id: "zoning-ces-exceeded",
      severity: "error",
      title: "Ground Coverage (CES) Exceeded",
      description: `Ground floor footprint (${metrics.groundFloorFootprintM2} m²) accounts for ${metrics.cesPercent}% of plot area, exceeding the permitted maximum of ${project.maxCESPercent}%.`,
      elementIds: levels.filter((l) => l.isGroundFloor || l.levelNumber === 0).map((l) => l.id),
      suggestedAction: "Distribute upper level spaces to upper floors or reduce ground floor room footprints.",
    });
  }

  // 2. Zoning COS / FAR Limit
  if (metrics.cosStatus === "exceeded") {
    issues.push({
      id: "zoning-cos-exceeded",
      severity: "error",
      title: "Floor Area Ratio (COS/FAR) Exceeded",
      description: `Total GFA (${metrics.totalGfaM2} m²) yields a COS of ${metrics.cosRatio}, exceeding maximum allowable zoning density of ${project.maxCOS}.`,
      elementIds: [],
      suggestedAction: "Rationalize spatial brief by reducing non-essential auxiliary spaces or revising target areas.",
    });
  }

  // 3. Level Column Footprint Overflow (Milanote Column capacity)
  for (const level of levels) {
    const nestedRooms = rooms.filter((r) => r.parentColumnId === level.id);
    const sumArea = nestedRooms.reduce((sum, r) => sum + (r.targetAreaM2 || 0), 0);
    if (level.maxFootprintM2 > 0 && sumArea > level.maxFootprintM2) {
      issues.push({
        id: `level-overflow-${level.id}`,
        severity: "warning",
        title: `Level Overflow in ${level.name}`,
        description: `Sum of rooms (${sumArea} m²) exceeds maximum structural floorplate allocation of ${level.maxFootprintM2} m² (+${Math.round(sumArea - level.maxFootprintM2)} m² over).`,
        elementIds: [level.id, ...nestedRooms.map((r) => r.id)],
        suggestedAction: `Move rooms to another level or expand the floorplate capacity for ${level.name}.`,
      });
    }
  }

  // 4. Orphan Rooms (Rooms not placed into any level column)
  const orphanRooms = rooms.filter((r) => !r.parentColumnId);
  if (orphanRooms.length > 0) {
    issues.push({
      id: "orphan-rooms",
      severity: "info",
      title: `${orphanRooms.length} Unallocated Room(s)`,
      description: `Spaces like "${orphanRooms.slice(0, 2).map((r) => r.name).join('", "')}"${orphanRooms.length > 2 ? ` and ${orphanRooms.length - 2} others` : ""} are floating on canvas without level assignment.`,
      elementIds: orphanRooms.map((r) => r.id),
      suggestedAction: "Drag and drop room cards directly into a Level Column container.",
    });
  }

  // 5. Acoustic Conflicts (Loud space directly connected or adjacent to Quiet space)
  for (const conn of connectors) {
    const source = rooms.find((r) => r.id === conn.sourceId);
    const target = rooms.find((r) => r.id === conn.targetId);

    if (source && target) {
      const isLoudQuiet =
        (source.acousticLevel === "loud" && target.acousticLevel === "quiet") ||
        (source.acousticLevel === "quiet" && target.acousticLevel === "loud");

      if (isLoudQuiet && conn.type === "direct_access") {
        issues.push({
          id: `acoustic-direct-${conn.id}`,
          severity: "error",
          title: `Direct Acoustic Conflict: "${source.name}" ↔ "${target.name}"`,
          description: `Direct access between a loud sound-generating space (${source.name}) and a quiet acoustically-sensitive room (${target.name}) violates sound isolation standards.`,
          elementIds: [source.id, target.id],
          suggestedAction: "Introduce an intermediate acoustic airlock/corridor buffer or change connector type to Acoustic Buffer.",
        });
      }
    }
  }

  // 6. Proximity-based Acoustic Conflict (when cards are placed physically close on canvas without buffer)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const r1 = rooms[i];
      const r2 = rooms[j];
      const isLoudQuiet =
        (r1.acousticLevel === "loud" && r2.acousticLevel === "quiet") ||
        (r1.acousticLevel === "quiet" && r2.acousticLevel === "loud");

      if (isLoudQuiet) {
        const dx = r1.x + r1.width / 2 - (r2.x + r2.width / 2);
        const dy = r1.y + r1.height / 2 - (r2.y + r2.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If placed in same level or within 140px on canvas without connector
        if (r1.parentColumnId && r1.parentColumnId === r2.parentColumnId) {
          const hasBufferConn = connectors.some(
            (c) =>
              (c.sourceId === r1.id && c.targetId === r2.id) ||
              (c.sourceId === r2.id && c.targetId === r1.id)
          );
          if (!hasBufferConn) {
            issues.push({
              id: `acoustic-level-proximity-${r1.id}-${r2.id}`,
              severity: "warning",
              title: `Acoustic Co-Location Risk: "${r1.name}" & "${r2.name}"`,
              description: `Loud room and quiet room share the same floor level without explicit acoustic buffer zoning.`,
              elementIds: [r1.id, r2.id],
              suggestedAction: "Ensure high STC (Sound Transmission Class) partition walls or separate zones.",
            });
          }
        }
      }
    }
  }

  // 7. Circulation Buffer Adequacy
  if (project.circulationFactor < 1.10) {
    issues.push({
      id: "low-circulation-factor",
      severity: "warning",
      title: "Under-estimated Circulation Multiplier",
      description: `Current circulation factor (${Math.round((project.circulationFactor - 1) * 100)}%) is too tight for complex public typologies (standard: 15%–20%).`,
      elementIds: [],
      suggestedAction: "Increase circulation allowance in Project Settings to prevent code egress compliance issues.",
    });
  }

  return issues;
}
