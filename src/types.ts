export type ScaleRatio = "1:50" | "1:100" | "1:200" | "1:500" | "1:1000";

export type RoomCategory =
  | "public"
  | "private"
  | "service"
  | "circulation"
  | "outdoor"
  | "technical"
  | "cultural";

export type DaylightRequirement =
  | "direct_south"
  | "diffuse_north"
  | "morning_east"
  | "evening_west"
  | "any"
  | "none";

export type AcousticLevel = "quiet" | "moderate" | "loud";

export type ConnectorType =
  | "direct_access"
  | "visual_link"
  | "acoustic_conflict"
  | "service_link";

export type ElementType =
  | "level_column"
  | "room_bubble"
  | "precedent_card"
  | "note_card"
  | "media_card"
  | "solar_compass"
  | "trace_layer"
  | "zoning_card";

export type GridMode = "metric" | "dot" | "iso" | "none";

export type AIEngineMode = "offline_rules" | "gemini_api" | "ollama_local";

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  id: string;
  tool: "pen" | "felt" | "highlighter" | "eraser" | "pencil";
  color: string;
  size: number;
  points: StrokePoint[];
  opacity: number;
}

export interface BaseCanvasElement {
  id: string;
  type: ElementType;
  x: number; // in canvas pixels
  y: number; // in canvas pixels
  width: number;
  height: number;
  zIndex: number;
  boardId: string;
  locked?: boolean;
  color?: string;
}

export interface RoomElement extends BaseCanvasElement {
  type: "room_bubble";
  name: string;
  category: RoomCategory;
  targetAreaM2: number;
  widthM: number;
  lengthM: number;
  ceilingHeightM?: number;
  occupancy?: number;
  daylightReq: DaylightRequirement;
  acousticLevel: AcousticLevel;
  parentColumnId?: string | null; // Milanote nesting
  notes?: string;
  tags?: string[];
}

export interface LevelColumnElement extends BaseCanvasElement {
  type: "level_column";
  name: string; // e.g. "Ground Floor (L0)", "Level +1"
  levelNumber: number; // 0, 1, 2, -1
  elevationM: number; // e.g. 0.0, 3.5, 7.0
  maxFootprintM2: number;
  targetAreaM2: number;
  roomIds: string[]; // Nested room ids
  isGroundFloor?: boolean;
  notes?: string;
}

export interface PrecedentElement extends BaseCanvasElement {
  type: "precedent_card";
  title: string;
  architect: string;
  location: string;
  year: number;
  typology: string;
  climateZone: string;
  imageUrl?: string;
  keyConcepts: string[];
  notes: string;
  sourceUrl?: string;
}

export interface NoteElement extends BaseCanvasElement {
  type: "note_card";
  title: string;
  content: string;
  colorTheme: "amber" | "slate" | "emerald" | "rose" | "indigo" | "cyan";
  checklist: Array<{ id: string; text: string; done: boolean }>;
  isPinned?: boolean;
}

export interface MediaElement extends BaseCanvasElement {
  type: "media_card";
  title: string;
  imageUrl: string;
  caption?: string;
  realWorldScale?: string; // e.g. "Site Plan 1:500"
  aspectRatio?: number;
}

export interface SolarCompassElement extends BaseCanvasElement {
  type: "solar_compass";
  latitude: number; // -90 to +90
  dayOfYear: number; // 1 to 365 (e.g. 172 for June 21)
  hourOfDay: number; // 6 to 18 (decimal, e.g. 14.5 for 2:30pm)
  northRotationDeg: number; // 0 to 360
  buildingHeightM: number;
  prevailingWindDirDeg: number; // 0 to 360
  windSpeedMps: number;
}

export interface TraceLayerElement extends BaseCanvasElement {
  type: "trace_layer";
  title: string;
  opacity: number; // 0.1 to 0.95
  tintColor: "yellow_trace" | "white_vellum" | "blue_grid" | "clear" | "kraft_paper" | "dot_grid";
  sheetSize?: "A4_landscape" | "A3_landscape" | "tabloid" | "roll" | "custom";
  showGrid?: boolean;
  showTitleBlock?: boolean;
  showTapeCorners?: boolean;
  author?: string;
  scaleLabel?: string;
  strokes: DrawingStroke[];
}

export interface ZoningCardElement extends BaseCanvasElement {
  type: "zoning_card";
  zoneCode: string; // e.g. "R3 - Mixed Urban"
  plotAreaM2: number;
  maxCESPercent: number; // Ground Coverage limit (e.g. 40%)
  maxCOS: number; // Floor Area Ratio limit (e.g. 1.8)
  maxHeightM: number; // e.g. 18.0m
  setbacksM: { front: number; rear: number; sides: number };
}

export type CanvasElement =
  | RoomElement
  | LevelColumnElement
  | PrecedentElement
  | NoteElement
  | MediaElement
  | SolarCompassElement
  | TraceLayerElement
  | ZoningCardElement;

export interface ConnectorLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectorType;
  label?: string;
  boardId: string;
  customCurveOffset?: number;
  controlOffset?: { x: number; y: number };
  curvature?: number;
  sourcePort?: "top" | "bottom" | "left" | "right" | "center";
  targetPort?: "top" | "bottom" | "left" | "right" | "center";
}

export interface SubBoard {
  id: string;
  name: string;
  description?: string;
  category: "site" | "program" | "massing" | "precedents" | "detail";
  createdAt: number;
  pan: { x: number; y: number };
  zoom: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  location: string;
  typology: string;
  scale: ScaleRatio;
  circulationFactor: number; // typically 1.15 (15% circulation buffer)
  plotAreaM2: number;
  maxCESPercent: number;
  maxCOS: number;
  createdAt: number;
  updatedAt: number;
}

export interface ArchitecturalMetrics {
  totalNetAreaM2: number;
  totalGfaM2: number; // Net Area * circulationFactor
  groundFloorFootprintM2: number;
  cesPercent: number; // (Ground Floor / Plot Area) * 100
  cosRatio: number; // (Total GFA / Plot Area)
  cesStatus: "valid" | "warning" | "exceeded";
  cosStatus: "valid" | "warning" | "exceeded";
  roomCount: number;
  levelCount: number;
}

export interface SpatialRuleIssue {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  elementIds: string[];
  suggestedAction?: string;
}

export interface DimensionString {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distanceM: number;
  label?: string;
  clearanceStatus?: "compliant" | "tight" | "non_compliant";
  boardId: string;
}

export interface WindProfile {
  directionDeg: number;
  speedMps: number;
  season: "summer" | "winter";
  description: string;
}

export interface SectionCutLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  boardId: string;
}

export interface AICritiqueResult {
  overallScore: number;
  verdict: string;
  strengths: string[];
  warnings: string[];
  bioclimaticNotes: string;
  recommendations: string[];
}

export interface StudioWorkspaceFile {
  version: "1.0";
  exportedAt: string;
  project: ProjectMetadata;
  subBoards: SubBoard[];
  activeBoardId: string;
  elements: CanvasElement[];
  connectors: ConnectorLink[];
  dimensions?: DimensionString[];
  sectionCuts?: SectionCutLine[];
}
