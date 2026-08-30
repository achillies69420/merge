import React, { useState, useRef, useMemo, useEffect } from "react";
import { useStudio } from "../../context/StudioContext";
import { RoomElement, LevelColumnElement } from "../../types";
import {
  Box,
  Sun,
  Layers,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  Compass,
  Eye,
  Sliders,
  Sparkles,
  Maximize2,
  Mountain,
  Waves,
  ArrowDownRight,
  TrendingDown,
  Activity,
  Trees,
} from "lucide-react";

interface Face3D {
  id: string;
  type: "room" | "slab" | "shadow" | "terrain" | "contour" | "foundation";
  depth: number;
  points: { x: number; y: number }[];
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  label?: string;
  labelPos?: { x: number; y: number };
  roomCategory?: string;
}

export const AxonometricMassingModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    elements,
    boardElements,
  } = useStudio();

  // Active Analysis Mode inside Modal
  const [activeTab, setActiveTab] = useState<"massing" | "terrain" | "earthwork">("massing");

  // Sync activeTab when modal is opened via top-level "terrain_analysis"
  useEffect(() => {
    if (activeModal === "terrain_analysis") {
      setActiveTab("terrain");
    } else if (activeModal === "3d_massing") {
      setActiveTab("massing");
    }
  }, [activeModal]);

  // 3D Camera Orbit & Perspective state
  const [azimuthDeg, setAzimuthDeg] = useState<number>(45); // 0 to 360 deg
  const [elevationDeg, setElevationDeg] = useState<number>(32); // 10 to 80 deg
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [explodedView, setExplodedView] = useState<number>(0); // 0 to 4 (level spacing multiplier)
  const [sunHour, setSunHour] = useState<number>(14); // 7 to 18 (solar hour)
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.35);
  const [renderMode, setRenderMode] = useState<"solid" | "translucent" | "wireframe">("solid");
  const [volumeOpacity, setVolumeOpacity] = useState<number>(0.95);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("all");

  // Terrain Analysis Specific State
  const [terrainProfile, setTerrainProfile] = useState<"hillside" | "ridge" | "terraces" | "valley" | "flat">("hillside");
  const [slopeGradientPct, setSlopeGradientPct] = useState<number>(14); // 0 to 35%
  const [slopeAspectDeg, setSlopeAspectDeg] = useState<number>(180); // 0 to 360 (180 = South-facing)
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showSlopeHeatmap, setShowSlopeHeatmap] = useState<boolean>(false);
  const [showWaterRunoff, setShowWaterRunoff] = useState<boolean>(true);
  const [foundationStrategy, setFoundationStrategy] = useState<"cut_and_fill" | "stepped" | "pilotis" | "retaining">("cut_and_fill");
  const [padElevationM, setPadElevationM] = useState<number>(0.0); // -3m to +3m

  const isDraggingOrbit = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startAz: 45, startEl: 32 });

  // Filter columns & rooms across active board or fallback to whole project
  const currentElements = boardElements.length > 0 ? boardElements : elements;
  const columns = currentElements.filter(
    (el): el is LevelColumnElement => el.type === "level_column"
  );
  const rooms = currentElements.filter(
    (el): el is RoomElement => el.type === "room_bubble"
  );

  // Group rooms by Level
  const levelsData = useMemo(() => {
    if (columns.length === 0) {
      return [
        {
          id: "lvl-ground",
          name: "Ground Level L00 (Default)",
          levelNumber: 0,
          elevationM: 0,
          floorHeightM: 4.0,
          rooms: rooms.length > 0 ? rooms : [],
        },
      ];
    }

    return [...columns]
      .sort((a, b) => (a.elevationM || 0) - (b.elevationM || 0))
      .map((col, idx) => {
        const assignedRooms = rooms.filter((r) => r.levelId === col.id);
        const unassignedRooms =
          idx === 0
            ? rooms.filter((r) => !r.levelId || r.levelId === "unassigned")
            : [];
        return {
          id: col.id,
          name: col.title || `Level ${col.levelNumber ?? idx}`,
          levelNumber: col.levelNumber ?? idx,
          elevationM: col.elevationM ?? idx * 3.8,
          floorHeightM: col.floorHeightM ?? 3.8,
          rooms: [...assignedRooms, ...unassignedRooms],
        };
      });
  }, [columns, rooms]);

  if (activeModal !== "3d_massing" && activeModal !== "terrain_analysis") return null;

  // Camera trigonometry
  const azRad = (azimuthDeg * Math.PI) / 180;
  const elRad = (elevationDeg * Math.PI) / 180;
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const cosEl = Math.cos(elRad);
  const sinEl = Math.sin(elRad);

  // Camera eye direction vector in 3D world space (towards viewer)
  const camX = sinAz * cosEl;
  const camY = cosAz * cosEl;
  const camZ = sinEl;

  // 3D world to screen projection
  const project3D = (x: number, y: number, z: number) => {
    // Step 1: Rotate around Z (azimuth)
    const rx = x * cosAz - y * sinAz;
    const ry = x * sinAz + y * cosAz;
    const rz = z;

    // Step 2: Pitch down around X (elevation)
    const sx = rx;
    const sy = ry * sinEl - rz * cosEl;

    // Screen pixel projection
    const screenX = 400 + sx * 2.1 * zoomScale;
    const screenY = 320 + sy * 2.1 * zoomScale;
    return { x: screenX, y: screenY };
  };

  // Distance along camera view axis for Painter's Algorithm depth sorting
  const getCameraDepth = (x: number, y: number, z: number) => {
    return x * camX + y * camY + z * camZ;
  };

  // Solar position calculation
  const sunAzimuth = (sunHour - 12) * 15; // Solar azimuth in degrees (-90 at 6am to +90 at 6pm)
  const sunAltitude = Math.max(15, 90 - Math.abs(sunHour - 12) * 7.5); // Sun height in degrees
  const sunAzRad = (sunAzimuth * Math.PI) / 180;
  const sunAltRad = (sunAltitude * Math.PI) / 180;

  // Solar light direction vector
  const sunVecX = Math.sin(sunAzRad) * Math.cos(sunAltRad);
  const sunVecY = Math.cos(sunAzRad) * Math.cos(sunAltRad);
  const sunVecZ = Math.sin(sunAltRad);

  // Helper function to calculate raw natural terrain elevation at (x, y) in world units
  const getNaturalTerrainZ = (x: number, y: number) => {
    if (terrainProfile === "flat") return 0;

    const aspectRad = (slopeAspectDeg * Math.PI) / 180;
    const slopeMultiplier = (slopeGradientPct / 100) * 0.35;

    // Distance projected along the slope aspect direction
    const distAlongAspect = -(x * Math.sin(aspectRad) + y * Math.cos(aspectRad));

    if (terrainProfile === "hillside") {
      return distAlongAspect * slopeMultiplier * 1.6;
    } else if (terrainProfile === "ridge") {
      const distToCenter = Math.sqrt(x * x + y * y);
      return Math.max(-25, 20 - distToCenter * slopeMultiplier * 1.5);
    } else if (terrainProfile === "terraces") {
      const rawZ = distAlongAspect * slopeMultiplier * 1.6;
      const terraceStep = 10;
      return Math.floor(rawZ / terraceStep) * terraceStep + 4;
    } else if (terrainProfile === "valley") {
      const distToCenter = Math.sqrt(x * x + y * y);
      return Math.min(30, -18 + distToCenter * slopeMultiplier * 1.6);
    }
    return 0;
  };

  // Helper to determine graded terrain Z (accounting for excavation pad)
  const getGradedTerrainZ = (x: number, y: number) => {
    const natZ = getNaturalTerrainZ(x, y);
    const inBuildingPad = Math.abs(x) < 140 && Math.abs(y) < 120;

    if (inBuildingPad && foundationStrategy === "cut_and_fill") {
      return padElevationM * 10;
    }
    return natZ;
  };

  // Slope Color Generator based on local gradient
  const getSlopeColor = (slopePct: number) => {
    if (slopePct < 8) return { r: 34, g: 197, b: 94, hex: "#22c55e", label: "< 8% (Buildable Flat)" }; // Green
    if (slopePct < 15) return { r: 234, g: 179, b: 8, hex: "#eab308", label: "8-15% (Moderate Ramp)" }; // Yellow
    if (slopePct < 25) return { r: 249, g: 115, b: 22, hex: "#f97316", label: "15-25% (Steep Retaining)" }; // Orange
    return { r: 239, g: 68, b: 68, hex: "#ef4444", label: "> 25% (Extreme Non-Buildable)" }; // Red
  };

  // Color palette by room category
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "public":
        return { r: 14, g: 165, b: 233, hex: "#0ea5e9" }; // Sky 500
      case "private":
        return { r: 168, g: 85, b: 247, hex: "#a855f7" }; // Purple 500
      case "circulation":
        return { r: 245, g: 158, b: 11, hex: "#f59e0b" }; // Amber 500
      case "service":
        return { r: 100, g: 116, b: 139, hex: "#64748b" }; // Slate 500
      case "cultural":
        return { r: 236, g: 72, b: 153, hex: "#ec4899" }; // Pink 500
      default:
        return { r: 20, g: 184, b: 166, hex: "#14b8a6" }; // Teal 500
    }
  };

  // Calculate face lighting multiplier for strong 3D volumetric definition
  const getFaceLighting = (nx: number, ny: number, nz: number) => {
    const dotSun = Math.max(0, nx * sunVecX + ny * sunVecY + nz * sunVecZ);
    // Base ambient differentiating top, front and side walls
    const baseAmbient = nz > 0 ? 0.95 : (Math.abs(nx) > Math.abs(ny) ? 0.72 : 0.58);
    return Math.min(1.0, baseAmbient * 0.75 + dotSun * 0.45);
  };

  // 3D Faces collection for Painter's Algorithm depth-sorting
  const renderedFaces: Face3D[] = [];
  const groundShadows: { points: { x: number; y: number }[] }[] = [];

  // -------------------------------------------------------------
  // 1. GENERATE 3D TERRAIN TOPOGRAPHY MESH & CONTOUR SLICES
  // -------------------------------------------------------------
  const terrainGridSize = 10;
  const terrainRangeX = [-180, 180];
  const terrainRangeY = [-160, 160];
  const stepX = (terrainRangeX[1] - terrainRangeX[0]) / terrainGridSize;
  const stepY = (terrainRangeY[1] - terrainRangeY[0]) / terrainGridSize;

  let totalCutVolumeM3 = 0;
  let totalFillVolumeM3 = 0;

  for (let i = 0; i < terrainGridSize; i++) {
    for (let j = 0; j < terrainGridSize; j++) {
      const x0 = terrainRangeX[0] + i * stepX;
      const x1 = x0 + stepX;
      const y0 = terrainRangeY[0] + j * stepY;
      const y1 = y0 + stepY;

      const z00 = getGradedTerrainZ(x0, y0);
      const z10 = getGradedTerrainZ(x1, y0);
      const z11 = getGradedTerrainZ(x1, y1);
      const z01 = getGradedTerrainZ(x0, y1);

      const natZ00 = getNaturalTerrainZ(x0, y0);
      const natZ10 = getNaturalTerrainZ(x1, y0);
      const natZ11 = getNaturalTerrainZ(x1, y1);
      const natZ01 = getNaturalTerrainZ(x0, y1);

      // Earthwork cut/fill estimation inside building perimeter
      const isInsidePad = Math.abs((x0 + x1) / 2) < 140 && Math.abs((y0 + y1) / 2) < 120;
      if (isInsidePad && foundationStrategy === "cut_and_fill") {
        const avgNatZ = (natZ00 + natZ10 + natZ11 + natZ01) / 4;
        const avgGradedZ = (z00 + z10 + z11 + z01) / 4;
        const cellAreaM2 = (stepX * stepY) / 100; // in real-world meters
        const heightDiffM = (avgNatZ - avgGradedZ) / 10;

        if (heightDiffM > 0) {
          totalCutVolumeM3 += heightDiffM * cellAreaM2;
        } else {
          totalFillVolumeM3 += Math.abs(heightDiffM) * cellAreaM2;
        }
      }

      // Compute normal vector for terrain facet
      const dz_dx = (z10 - z00) / stepX;
      const dz_dy = (z01 - z00) / stepY;
      let nx = -dz_dx;
      let ny = -dz_dy;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const light = getFaceLighting(nx, ny, nz);
      const avgZ = (z00 + z10 + z11 + z01) / 4;
      const centerX = (x0 + x1) / 2;
      const centerY = (y0 + y1) / 2;
      const depth = getCameraDepth(centerX, centerY, avgZ) - 40; // slightly pushed behind rooms

      // Determine face fill
      let terrainFill = "";
      if (showSlopeHeatmap) {
        const slopePct = Math.min(35, Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy) * 100);
        const col = getSlopeColor(slopePct);
        terrainFill = `rgb(${Math.round(col.r * light)}, ${Math.round(col.g * light)}, ${Math.round(col.b * light)})`;
      } else {
        // Natural topographic earth tone
        const baseGrey = 34 + Math.round((avgZ + 30) * 0.4);
        terrainFill = `rgb(${Math.round((baseGrey - 4) * light)}, ${Math.round((baseGrey + 8) * light)}, ${Math.round((baseGrey + 2) * light)})`;
      }

      const p00 = project3D(x0, y0, z00);
      const p10 = project3D(x1, y0, z10);
      const p11 = project3D(x1, y1, z11);
      const p01 = project3D(x0, y1, z01);

      renderedFaces.push({
        id: `terrain-${i}-${j}`,
        type: "terrain",
        depth,
        points: [p00, p10, p11, p01],
        fill: terrainFill,
        fillOpacity: activeTab === "terrain" || activeTab === "earthwork" ? 0.95 : 0.65,
        stroke: showContours ? "rgba(113, 113, 122, 0.45)" : "rgba(39, 39, 42, 0.5)",
        strokeWidth: showContours ? 0.75 : 0.4,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. GENERATE SLABS AND 6-SIDED SOLID ROOM VOLUMES
  // -------------------------------------------------------------
  levelsData.forEach((lvl, lIdx) => {
    if (selectedLevelId !== "all" && lvl.id !== selectedLevelId) return;

    const baseElevation = foundationStrategy === "cut_and_fill" ? padElevationM * 10 : 0;
    const zBase = baseElevation + lvl.elevationM * 10 + lIdx * explodedView * 28;
    const floorH = Math.max(3.0, lvl.floorHeightM) * 9;
    const zTop = zBase + floorH;
    const slabThickness = 3.5;

    // Floor Plate Slab Dimensions
    const sX1 = -135;
    const sX2 = 135;
    const sY1 = -115;
    const sY2 = 115;
    const slabZ0 = zBase - slabThickness;
    const slabZ1 = zBase;

    // 1. Solid Slabs (Top, Bottom, 4 Side edges)
    const slabFaces = [
      // Slab Top Face
      {
        normal: [0, 0, 1],
        vertices: [
          [sX1, sY1, slabZ1],
          [sX2, sY1, slabZ1],
          [sX2, sY2, slabZ1],
          [sX1, sY2, slabZ1],
        ],
      },
      // Slab Front Face (+Y)
      {
        normal: [0, 1, 0],
        vertices: [
          [sX1, sY2, slabZ0],
          [sX2, sY2, slabZ0],
          [sX2, sY2, slabZ1],
          [sX1, sY2, slabZ1],
        ],
      },
      // Slab Back Face (-Y)
      {
        normal: [0, -1, 0],
        vertices: [
          [sX2, sY1, slabZ0],
          [sX1, sY1, slabZ0],
          [sX1, sY1, slabZ1],
          [sX2, sY1, slabZ1],
        ],
      },
      // Slab Right Face (+X)
      {
        normal: [1, 0, 0],
        vertices: [
          [sX2, sY1, slabZ0],
          [sX2, sY2, slabZ0],
          [sX2, sY2, slabZ1],
          [sX2, sY1, slabZ1],
        ],
      },
      // Slab Left Face (-X)
      {
        normal: [-1, 0, 0],
        vertices: [
          [sX1, sY2, slabZ0],
          [sX1, sY1, slabZ0],
          [sX1, sY1, slabZ1],
          [sX1, sY2, slabZ1],
        ],
      },
    ];

    slabFaces.forEach((sf, sfIdx) => {
      const dotCam = sf.normal[0] * camX + sf.normal[1] * camY + sf.normal[2] * camZ;
      if (dotCam > 0.001) {
        const light = getFaceLighting(sf.normal[0], sf.normal[1], sf.normal[2]);
        const slabGrey = Math.round(48 * light);
        const screenPts = sf.vertices.map((v) => project3D(v[0], v[1], v[2]));
        const center = sf.vertices.reduce(
          (acc, v) => [acc[0] + v[0] / 4, acc[1] + v[1] / 4, acc[2] + v[2] / 4],
          [0, 0, 0]
        );
        const depth = getCameraDepth(center[0], center[1], center[2]);

        renderedFaces.push({
          id: `slab-${lvl.id}-${sfIdx}`,
          type: "slab",
          depth,
          points: screenPts,
          fill: `rgb(${slabGrey}, ${slabGrey + 4}, ${slabGrey + 10})`,
          fillOpacity:
            renderMode === "wireframe"
              ? 0.08
              : renderMode === "translucent"
              ? Math.min(0.8, volumeOpacity * 0.75)
              : 0.92,
          stroke: renderMode === "wireframe" ? "#0284c7" : "#38bdf8",
          strokeWidth: sf.normal[2] === 1 ? 1.4 : 0.8,
          strokeDasharray: sf.normal[2] === 1 ? "4,2" : undefined,
        });
      }
    });

    // 2. Complete 6-Sided Solid Enclosed Room Volumes
    const rowCount = Math.max(1, Math.ceil(Math.sqrt(lvl.rooms.length || 1)));
    const colCount = Math.max(1, Math.ceil((lvl.rooms.length || 1) / rowCount));
    const cellW = (sX2 - sX1 - 24) / colCount;
    const cellH = (sY2 - sY1 - 24) / rowCount;

    lvl.rooms.forEach((room, rIdx) => {
      const col = rIdx % colCount;
      const row = Math.floor(rIdx / colCount);

      const targetArea = room.targetAreaM2 || 45;
      const areaRatio = Math.sqrt(Math.max(0.4, Math.min(2.2, targetArea / 50)));
      const rxW = Math.min(cellW * 0.88, (cellW * 0.78) * areaRatio);
      const rxL = Math.min(cellH * 0.88, (cellH * 0.78) * areaRatio);

      const cx = sX1 + 14 + col * cellW + cellW / 2;
      const cy = sY1 + 14 + row * cellH + cellH / 2;

      const x1 = cx - rxW / 2;
      const x2 = cx + rxW / 2;
      const y1 = cy - rxL / 2;
      const y2 = cy + rxL / 2;

      const z0 = zBase;
      const z1 = zTop;

      const baseColor = getCategoryColor(room.category);

      // 6 Distinct Faces for a Fully Sealed 3D Cuboid
      const roomFaces = [
        // 1. Top Roof Face (+Z)
        {
          name: "top",
          normal: [0, 0, 1],
          vertices: [
            [x1, y1, z1],
            [x2, y1, z1],
            [x2, y2, z1],
            [x1, y2, z1],
          ],
        },
        // 2. Front Facade (+Y, South)
        {
          name: "front",
          normal: [0, 1, 0],
          vertices: [
            [x1, y2, z0],
            [x2, y2, z0],
            [x2, y2, z1],
            [x1, y2, z1],
          ],
        },
        // 3. Back Facade (-Y, North)
        {
          name: "back",
          normal: [0, -1, 0],
          vertices: [
            [x2, y1, z0],
            [x1, y1, z0],
            [x1, y1, z1],
            [x2, y1, z1],
          ],
        },
        // 4. Right Facade (+X, East)
        {
          name: "right",
          normal: [1, 0, 0],
          vertices: [
            [x2, y1, z0],
            [x2, y2, z0],
            [x2, y2, z1],
            [x2, y1, z1],
          ],
        },
        // 5. Left Facade (-X, West)
        {
          name: "left",
          normal: [-1, 0, 0],
          vertices: [
            [x1, y2, z0],
            [x1, y1, z0],
            [x1, y1, z1],
            [x1, y2, z1],
          ],
        },
        // 6. Bottom Underside Face (-Z)
        {
          name: "bottom",
          normal: [0, 0, -1],
          vertices: [
            [x1, y2, z0],
            [x2, y2, z0],
            [x2, y1, z0],
            [x1, y1, z0],
          ],
        },
      ];

      // Ground Cast Shadows
      if (lIdx === 0 && shadowOpacity > 0.05) {
        const shadowOffsetNat = (z1 / Math.tan(sunAltRad)) * 0.4;
        const shX1 = x1 + Math.sin(sunAzRad) * shadowOffsetNat;
        const shX2 = x2 + Math.sin(sunAzRad) * shadowOffsetNat;
        const shY1 = y1 + Math.cos(sunAzRad) * shadowOffsetNat;
        const shY2 = y2 + Math.cos(sunAzRad) * shadowOffsetNat;

        groundShadows.push({
          points: [
            project3D(x1, y1, 0),
            project3D(x2, y1, 0),
            project3D(shX2, shY1, 0),
            project3D(shX2, shY2, 0),
            project3D(shX1, shY2, 0),
            project3D(x1, y2, 0),
          ],
        });
      }

      roomFaces.forEach((rf) => {
        const dotCam =
          rf.normal[0] * camX + rf.normal[1] * camY + rf.normal[2] * camZ;

        if (dotCam > 0.001) {
          const light = getFaceLighting(
            rf.normal[0],
            rf.normal[1],
            rf.normal[2]
          );

          const r = Math.min(255, Math.round(baseColor.r * light));
          const g = Math.min(255, Math.round(baseColor.g * light));
          const b = Math.min(255, Math.round(baseColor.g * light));

          const screenPts = rf.vertices.map((v) => project3D(v[0], v[1], v[2]));
          const center = rf.vertices.reduce(
            (acc, v) => [acc[0] + v[0] / 4, acc[1] + v[1] / 4, acc[2] + v[2] / 4],
            [0, 0, 0]
          );
          const depth = getCameraDepth(center[0], center[1], center[2]);

          const labelPos =
            rf.name === "top"
              ? project3D(cx, cy, z1 + 1.5)
              : undefined;

          renderedFaces.push({
            id: `room-${lvl.id}-${room.id || rIdx}-${rf.name}`,
            type: "room",
            depth,
            points: screenPts,
            fill: `rgb(${r}, ${g}, ${b})`,
            fillOpacity:
              renderMode === "wireframe"
                ? 0.06
                : renderMode === "translucent"
                ? volumeOpacity
                : 0.96,
            stroke:
              renderMode === "wireframe"
                ? "#38bdf8"
                : renderMode === "translucent"
                ? "rgba(255,255,255,0.65)"
                : "#ffffff",
            strokeWidth: rf.name === "top" ? 1.3 : 1.0,
            label: rf.name === "top" ? room.name : undefined,
            labelPos,
            roomCategory: room.category,
          });
        }
      });
    });
  });

  // Sort all 3D faces from back to front (Painter's Algorithm)
  renderedFaces.sort((a, b) => a.depth - b.depth);

  // Mouse Orbit Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingOrbit.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startAz: azimuthDeg,
      startEl: elevationDeg,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingOrbit.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const newAz = (dragStart.current.startAz - dx * 0.5 + 360) % 360;
    const newEl = Math.max(12, Math.min(85, dragStart.current.startEl + dy * 0.35));

    setAzimuthDeg(Math.round(newAz));
    setElevationDeg(Math.round(newEl));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingOrbit.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const setPreset = (az: number, el: number, exp: number) => {
    setAzimuthDeg(az);
    setElevationDeg(el);
    setExplodedView(exp);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111113] border border-[#2A2A2E] w-full max-w-6xl h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header & Analysis Tabs */}
        <div className="h-14 bg-[#18181B] border-b border-[#2A2A2E] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              {activeTab === "terrain" || activeTab === "earthwork" ? (
                <Mountain className="w-4 h-4 text-emerald-400" />
              ) : (
                <Box className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#E4E4E7]">
                  {activeTab === "terrain"
                    ? "3D Site Topography & Slope Analysis"
                    : activeTab === "earthwork"
                    ? "Foundation Grading & Cut / Fill Earthwork"
                    : "3D Axonometric Massing & Solar Study"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  {terrainProfile.toUpperCase()} • {slopeGradientPct}% SLOPE
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Interactive 3D topography contours, slope gradient classification, earthwork cut/fill & volumetric simulation
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-[#141416] p-1 rounded-xl border border-[#2A2A2E]">
            <button
              onClick={() => setActiveTab("massing")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "massing"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Massing</span>
            </button>
            <button
              onClick={() => setActiveTab("terrain")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "terrain"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Terrain & Slope</span>
            </button>
            <button
              onClick={() => setActiveTab("earthwork")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "earthwork"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Cut & Fill</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal("none")}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2E] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* 3D Canvas Viewport */}
          <div
            className="flex-1 relative bg-[#09090b] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <svg
              className="w-full h-full pointer-events-none"
              viewBox="0 0 800 600"
            >
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <filter id="shadowBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <marker
                  id="waterFlowArrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Solar Shadow Projections on Ground */}
              <g filter="url(#shadowBlur)">
                {groundShadows.map((sh, sIdx) => (
                  <polygon
                    key={`sh-${sIdx}`}
                    points={sh.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="#000000"
                    fillOpacity={shadowOpacity}
                  />
                ))}
              </g>

              {/* Render Depth-Sorted Full 3D Faces (Terrain + Slabs + Volumes) */}
              {renderedFaces.map((face) => (
                <g key={face.id}>
                  <polygon
                    points={face.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={face.fill}
                    fillOpacity={face.fillOpacity}
                    stroke={face.stroke}
                    strokeWidth={face.strokeWidth}
                    strokeDasharray={face.strokeDasharray}
                    strokeLinejoin="round"
                  />
                  {/* Floating Room Label Stamp */}
                  {face.label && face.labelPos && (
                    <g transform={`translate(${face.labelPos.x}, ${face.labelPos.y})`}>
                      <text
                        x="0"
                        y="3"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        className="pointer-events-none drop-shadow"
                        style={{
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        {face.label}
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* Water Runoff Drainage Vectors */}
              {showWaterRunoff && (activeTab === "terrain" || activeTab === "earthwork") && (
                <g opacity="0.85">
                  {[-120, -40, 40, 120].map((rx, ri) =>
                    [-100, 0, 100].map((ry, rj) => {
                      const natZ = getGradedTerrainZ(rx, ry);
                      const aspectRad = (slopeAspectDeg * Math.PI) / 180;
                      // Flow is downhill (opposite of aspect vector)
                      const flowDx = Math.sin(aspectRad) * 22;
                      const flowDy = Math.cos(aspectRad) * 22;
                      const pStart = project3D(rx, ry, natZ + 2);
                      const pEnd = project3D(rx + flowDx, ry + flowDy, natZ - 2);

                      return (
                        <g key={`flow-${ri}-${rj}`}>
                          <line
                            x1={pStart.x}
                            y1={pStart.y}
                            x2={pEnd.x}
                            y2={pEnd.y}
                            stroke="#38bdf8"
                            strokeWidth="1.6"
                            strokeDasharray="4,2"
                            markerEnd="url(#waterFlowArrow)"
                          />
                        </g>
                      );
                    })
                  )}
                </g>
              )}

              {/* Sun Celestial Orbit Position Indicator */}
              <g
                transform={`translate(${
                  400 + Math.sin(sunAzRad) * 260
                }, ${110 - Math.sin(sunAltRad) * 60})`}
              >
                <circle r="20" fill="url(#sunGlow)" />
                <circle r="8" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x="0"
                  y="26"
                  fill="#fbbf24"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {sunHour}:00 Sun ({Math.round(sunAltitude)}° Alt / {Math.round(sunAzimuth)}° Az)
                </text>
              </g>
            </svg>

            {/* Quick View Presets HUD */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-[#151517]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#2A2A2E] z-10 pointer-events-auto">
              <span className="text-[10px] font-mono text-[#A1A1AA] uppercase mr-1">Camera:</span>
              <button
                onClick={() => setPreset(45, 32, 0)}
                className="px-2 py-0.5 text-xs bg-[#222226] hover:bg-sky-500/20 text-[#E4E4E7] hover:text-sky-300 rounded border border-[#2A2A2E] transition-colors"
              >
                Isometric 45°
              </button>
              <button
                onClick={() => setPreset(180, 20, 0)}
                className="px-2 py-0.5 text-xs bg-[#222226] hover:bg-emerald-500/20 text-[#E4E4E7] hover:text-emerald-300 rounded border border-[#2A2A2E] transition-colors"
              >
                Downhill Slope
              </button>
              <button
                onClick={() => setPreset(0, 25, 0)}
                className="px-2 py-0.5 text-xs bg-[#222226] hover:bg-sky-500/20 text-[#E4E4E7] hover:text-sky-300 rounded border border-[#2A2A2E] transition-colors"
              >
                Front Axo 0°
              </button>
              <button
                onClick={() => setPreset(90, 75, 0)}
                className="px-2 py-0.5 text-xs bg-[#222226] hover:bg-sky-500/20 text-[#E4E4E7] hover:text-sky-300 rounded border border-[#2A2A2E] transition-colors"
              >
                Top Plan (Contour Map)
              </button>
            </div>

            {/* Slope Aspect Orientation Compass Tag */}
            <div className="absolute top-4 right-4 bg-[#151517]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#2A2A2E] text-xs font-mono text-[#E4E4E7] flex items-center gap-2 pointer-events-auto">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-[#A1A1AA] block uppercase">Slope Orientation</span>
                <span className="font-bold text-emerald-300">
                  {slopeAspectDeg === 180 ? "South (180°)" : slopeAspectDeg === 0 ? "North (0°)" : slopeAspectDeg === 90 ? "East (90°)" : `${slopeAspectDeg}°`} • {slopeGradientPct}%
                </span>
              </div>
            </div>

            {/* Zoom & Orbit HUD Bar */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs font-mono text-[#A1A1AA] bg-[#151517]/90 px-3 py-1.5 rounded-xl border border-[#2A2A2E] pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Orbit: {azimuthDeg}° / Tilt: {elevationDeg}°</span>
              </div>
              <div className="w-[1px] h-3.5 bg-[#2A2A2E]" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                  className="p-1 hover:text-white rounded hover:bg-[#222226]"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  className="p-1 hover:text-white rounded hover:bg-[#222226]"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Parametric Control Panel */}
          <div className="w-84 bg-[#151517] border-l border-[#2A2A2E] p-5 flex flex-col gap-4 overflow-y-auto">
            {/* TAB 1: SITE TERRAIN & TOPOGRAPHY CONTROLS */}
            {(activeTab === "terrain" || activeTab === "earthwork") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Mountain className="w-3.5 h-3.5" />
                    <span>Site Topography Profile</span>
                  </h3>
                </div>

                {/* Terrain Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#E4E4E7] block font-medium">Topographic Preset</label>
                  <select
                    value={terrainProfile}
                    onChange={(e) => setTerrainProfile(e.target.value as any)}
                    className="w-full bg-[#18181B] text-white border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="hillside">Sloped Hillside (Uniform Gradient)</option>
                    <option value="ridge">Crest Ridge / Promontory</option>
                    <option value="terraces">Terraced Plateaus / Stepped Contours</option>
                    <option value="valley">Valley Bowl / Depression</option>
                    <option value="flat">Graded Flat Site (0%)</option>
                  </select>
                </div>

                {/* Slope Gradient Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#E4E4E7]">
                    <span>Slope Gradient</span>
                    <span className="font-mono text-emerald-400 font-bold">{slopeGradientPct}% ({(slopeGradientPct * 0.57).toFixed(1)}°)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={slopeGradientPct}
                    onChange={(e) => setSlopeGradientPct(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#222226] rounded accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                    <span>0% (Flat)</span>
                    <span>15% (Retaining limit)</span>
                    <span>35% (Steep)</span>
                  </div>
                </div>

                {/* Slope Aspect Orientation Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#E4E4E7]">
                    <span>Slope Aspect (Orientation)</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {slopeAspectDeg === 180 ? "South (180°)" : slopeAspectDeg === 0 ? "North (0°)" : slopeAspectDeg === 90 ? "East (90°)" : slopeAspectDeg === 270 ? "West (270°)" : `${slopeAspectDeg}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={slopeAspectDeg}
                    onChange={(e) => setSlopeAspectDeg(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#222226] rounded accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Visual Analysis Overlays */}
                <div className="space-y-2 pt-3 border-t border-[#2A2A2E]">
                  <label className="text-xs text-[#E4E4E7] block font-medium">Analysis Visual Layers</label>
                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] cursor-pointer hover:text-white">
                    <span>1.0m Elevation Contours</span>
                    <input
                      type="checkbox"
                      checked={showContours}
                      onChange={(e) => setShowContours(e.target.checked)}
                      className="rounded border-[#2A2A2E] text-emerald-500 focus:ring-0"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] cursor-pointer hover:text-white">
                    <span>Slope Gradient Heatmap</span>
                    <input
                      type="checkbox"
                      checked={showSlopeHeatmap}
                      onChange={(e) => setShowSlopeHeatmap(e.target.checked)}
                      className="rounded border-[#2A2A2E] text-emerald-500 focus:ring-0"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] cursor-pointer hover:text-white">
                    <span>Stormwater Runoff Vectors</span>
                    <input
                      type="checkbox"
                      checked={showWaterRunoff}
                      onChange={(e) => setShowWaterRunoff(e.target.checked)}
                      className="rounded border-[#2A2A2E] text-sky-500 focus:ring-0"
                    />
                  </label>
                </div>

                {/* Foundation Grading Strategy */}
                <div className="space-y-2 pt-3 border-t border-[#2A2A2E]">
                  <label className="text-xs text-[#E4E4E7] block font-medium">Foundation Site Integration</label>
                  <select
                    value={foundationStrategy}
                    onChange={(e) => setFoundationStrategy(e.target.value as any)}
                    className="w-full bg-[#18181B] text-white border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
                  >
                    <option value="cut_and_fill">Excavated Building Pad (Cut & Fill)</option>
                    <option value="stepped">Stepped Hillside Terraces</option>
                    <option value="pilotis">Elevated Structural Pilotis (Stilts)</option>
                    <option value="retaining">Subterranean Retaining Wall</option>
                  </select>

                  {foundationStrategy === "cut_and_fill" && (
                    <div className="space-y-1 pt-1.5">
                      <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                        <span>Pad Finished Level Offset</span>
                        <span className="font-mono text-amber-400">{padElevationM.toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-2.5"
                        max="2.5"
                        step="0.25"
                        value={padElevationM}
                        onChange={(e) => setPadElevationM(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#222226] rounded accent-amber-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Cut & Fill Real-Time Earthwork Calculation Summary */}
                <div className="bg-[#18181B] border border-[#2A2A2E] rounded-xl p-3 text-xs space-y-2">
                  <div className="text-[11px] font-mono font-bold text-amber-400 flex items-center justify-between">
                    <span>EARTHWORK CUT / FILL BALANCE</span>
                    <span className="text-[10px] text-[#A1A1AA]">Site Pad Area</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Excavated Cut:
                    </span>
                    <span className="font-mono text-rose-400 font-bold">{Math.round(totalCutVolumeM3)} m³</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Embankment Fill:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{Math.round(totalFillVolumeM3)} m³</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA] pt-1 border-t border-[#2A2A2E]">
                    <span>Net Balance:</span>
                    <span className="font-mono text-[#E4E4E7] font-bold">
                      {Math.abs(Math.round(totalCutVolumeM3 - totalFillVolumeM3))} m³ {totalCutVolumeM3 > totalFillVolumeM3 ? "(Net Export)" : "(Net Import)"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MASSING & SOLAR CONTROLS */}
            {activeTab === "massing" && (
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider mb-3">
                  Massing Controls
                </h3>

                {/* Level Filter */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs text-[#E4E4E7] block">Focus Building Level</label>
                  <select
                    value={selectedLevelId}
                    onChange={(e) => setSelectedLevelId(e.target.value)}
                    className="w-full bg-[#18181B] text-white border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  >
                    <option value="all">Stack All Levels ({levelsData.length})</option>
                    {levelsData.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name} ({lvl.rooms.length} Spaces)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camera Azimuth Slider */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs text-[#E4E4E7]">
                    <span>Orbit Azimuth</span>
                    <span className="font-mono text-sky-400">{azimuthDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={azimuthDeg}
                    onChange={(e) => setAzimuthDeg(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#222226] rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Exploded View Spacing */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs text-[#E4E4E7]">
                    <span>Exploded Level Stacking</span>
                    <span className="font-mono text-sky-400">{explodedView * 2}m</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="0.5"
                    value={explodedView}
                    onChange={(e) => setExplodedView(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#222226] rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Render Style & Shading */}
                <div className="space-y-2 pt-3 border-t border-[#2A2A2E]">
                  <label className="text-xs text-[#E4E4E7] block font-medium">Volumetric Shading Mode</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#18181B] p-1 rounded-lg border border-[#2A2A2E]">
                    <button
                      onClick={() => setRenderMode("solid")}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        renderMode === "solid"
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => setRenderMode("translucent")}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        renderMode === "translucent"
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      Glass
                    </button>
                    <button
                      onClick={() => setRenderMode("wireframe")}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        renderMode === "wireframe"
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-[#A1A1AA] hover:text-white"
                      }`}
                    >
                      Wire
                    </button>
                  </div>

                  {renderMode === "translucent" && (
                    <div className="space-y-1 pt-1.5 animate-in fade-in duration-150">
                      <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                        <span>Wall Opacity</span>
                        <span className="font-mono text-sky-400">{Math.round(volumeOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.9"
                        step="0.05"
                        value={volumeOpacity}
                        onChange={(e) => setVolumeOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#222226] rounded accent-sky-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Solar Shadow Simulation */}
                <div className="border-t border-[#2A2A2E] pt-3 mt-3">
                  <h3 className="text-xs font-mono font-bold uppercase text-[#A1A1AA] tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Solar Study & Shadows</span>
                  </h3>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs text-[#E4E4E7]">
                      <span>Hour of Day</span>
                      <span className="font-mono text-amber-400">{sunHour}:00</span>
                    </div>
                    <input
                      type="range"
                      min="7"
                      max="18"
                      value={sunHour}
                      onChange={(e) => setSunHour(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#222226] rounded accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs text-[#E4E4E7]">
                      <span>Shadow Density</span>
                      <span className="font-mono text-amber-400">{Math.round(shadowOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={shadowOpacity}
                      onChange={(e) => setShadowOpacity(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#222226] rounded accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Volumetric Metrics Summary */}
                <div className="mt-4 bg-[#18181B] border border-[#2A2A2E] rounded-xl p-3 text-xs space-y-2">
                  <div className="text-[11px] font-mono font-bold text-sky-400 flex items-center justify-between">
                    <span>VOLUMETRIC SCHEDULE</span>
                    <span>{levelsData.length} Levels</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Total Volume:</span>
                    <span className="font-mono text-[#E4E4E7] font-bold">
                      {Math.round(
                        levelsData.reduce(
                          (acc, lvl) =>
                            acc +
                            lvl.rooms.reduce(
                              (s, r) => s + (r.targetAreaM2 || 50) * lvl.floorHeightM,
                              0
                            ),
                          0
                        )
                      )}{" "}
                      m³
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Gross Floor Area:</span>
                    <span className="font-mono text-[#E4E4E7] font-bold">
                      {Math.round(
                        levelsData.reduce(
                          (acc, lvl) =>
                            acc +
                            lvl.rooms.reduce((s, r) => s + (r.targetAreaM2 || 50), 0),
                          0
                        )
                      )}{" "}
                      m²
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Total Height:</span>
                    <span className="font-mono text-[#E4E4E7] font-bold">
                      {(levelsData.length * 3.8).toFixed(1)}m
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
