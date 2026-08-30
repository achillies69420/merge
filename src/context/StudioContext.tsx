import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CanvasElement,
  ConnectorLink,
  ProjectMetadata,
  SubBoard,
  ScaleRatio,
  GridMode,
  AIEngineMode,
  ArchitecturalMetrics,
  SpatialRuleIssue,
  StudioWorkspaceFile,
  ConnectorType,
  RoomCategory,
  RoomElement,
  LevelColumnElement,
  DimensionString,
  SectionCutLine,
} from "../types";
import { DEFAULT_WORKSPACE } from "../data/defaultWorkspace";
import { saveWorkspaceToStorage, loadWorkspaceFromStorage, downloadJsonFile, parseUploadedStudioFile } from "../utils/indexedDb";
import { computeArchitecturalMetrics, runOfflineCadRuleChecker } from "../utils/cadRules";
import { computeForceClusterLayout } from "../utils/forceLayout";

export type ToolType =
  | "select"
  | "pan"
  | "level_column"
  | "room_bubble"
  | "trace_layer"
  | "precedent_card"
  | "solar_compass"
  | "note_card"
  | "media_card"
  | "connector"
  | "dimension_ruler"
  | "section_cut";

export type StudioModalType =
  | "none"
  | "3d_massing"
  | "terrain_analysis"
  | "adjacency_matrix"
  | "building_section"
  | "wind_rose"
  | "presentation_pinup"
  | "sheet_export";

interface StudioContextType {
  project: ProjectMetadata;
  subBoards: SubBoard[];
  activeBoardId: string;
  activeBoard: SubBoard;
  elements: CanvasElement[];
  boardElements: CanvasElement[];
  connectors: ConnectorLink[];
  boardConnectors: ConnectorLink[];
  dimensions: DimensionString[];
  boardDimensions: DimensionString[];
  sectionCuts: SectionCutLine[];
  boardSectionCuts: SectionCutLine[];
  selectedElementIds: string[];
  activeTool: ToolType;
  activeConnectorType: ConnectorType;
  connectingSourceId: string | null;
  gridMode: GridMode;
  snapToGrid: boolean;
  gridSnapM: number;
  aiEngineMode: AIEngineMode;
  customApiKey: string;
  ollamaUrl: string;
  isRightDrawerOpen: boolean;
  rightDrawerTab: "rules" | "brief" | "critique" | "matrix" | "schedule";
  metrics: ArchitecturalMetrics;
  spatialIssues: SpatialRuleIssue[];
  storageStatus: "saved" | "saving" | "offline";
  canUndo: boolean;
  canRedo: boolean;
  activeModal: StudioModalType;
  
  // Setters & Actions
  setProject: (update: Partial<ProjectMetadata>) => void;
  setActiveTool: (tool: ToolType) => void;
  setActiveConnectorType: (type: ConnectorType) => void;
  setConnectingSourceId: (id: string | null) => void;
  setGridMode: (mode: GridMode) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSnapM: (meters: number) => void;
  setScale: (scale: ScaleRatio) => void;
  setAiEngineMode: (mode: AIEngineMode) => void;
  setCustomApiKey: (key: string) => void;
  setOllamaUrl: (url: string) => void;
  setIsRightDrawerOpen: (open: boolean) => void;
  setRightDrawerTab: (tab: "rules" | "brief" | "critique" | "matrix" | "schedule") => void;
  setSelectedElementIds: (ids: string[]) => void;
  toggleSelectElement: (id: string, multi?: boolean) => void;
  setActiveModal: (modal: StudioModalType) => void;
  
  // Board operations
  setActiveBoardId: (boardId: string) => void;
  addSubBoard: (name: string, category?: SubBoard["category"]) => void;
  removeSubBoard: (boardId: string) => void;
  renameSubBoard: (boardId: string, name: string) => void;
  updateBoardViewport: (boardId: string, pan: { x: number; y: number }, zoom: number) => void;

  // Element operations
  addElement: (element: Partial<CanvasElement> & { type: CanvasElement["type"] }) => string;
  updateElement: (id: string, update: Partial<CanvasElement>) => void;
  updateElementPosition: (id: string, x: number, y: number) => void;
  removeElement: (id: string) => void;
  moveRoomToColumn: (roomId: string, targetColumnId: string | null) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Connector operations
  addConnector: (sourceId: string, targetId: string, type?: ConnectorType, label?: string) => void;
  removeConnector: (id: string) => void;
  updateConnector: (id: string, update: Partial<ConnectorLink>) => void;

  // Dimension & Section Cut operations
  addDimension: (dim: Omit<DimensionString, "id" | "boardId">) => string;
  removeDimension: (id: string) => void;
  clearDimensions: () => void;
  addSectionCut: (cut: Omit<SectionCutLine, "id" | "boardId">) => string;
  removeSectionCut: (id: string) => void;

  // Smart Architectural Auto-Layout
  autoClusterLayout: () => void;

  // Connector selection
  selectedConnectorId: string | null;
  setSelectedConnectorId: (id: string | null) => void;
  reconnectConnector: (connectorId: string, newSourceId?: string, newTargetId?: string) => void;
  addConnectedBranch: (
    sourceId: string,
    options?: {
      category?: RoomCategory;
      direction?: "right" | "bottom" | "left" | "top";
      name?: string;
      targetAreaM2?: number;
      connectorType?: ConnectorType;
    }
  ) => string;

  // Workspace actions
  undo: () => void;
  redo: () => void;
  exportStudio: () => void;
  importStudio: (file: File) => Promise<void>;
  resetToDemo: () => void;
}

const StudioContext = createContext<StudioContextType | null>(null);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<StudioWorkspaceFile>(DEFAULT_WORKSPACE);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [activeConnectorType, setActiveConnectorType] = useState<ConnectorType>("direct_access");
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>("metric");
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSnapM, setGridSnapM] = useState<number>(1.0);
  const [aiEngineMode, setAiEngineMode] = useState<AIEngineMode>("offline_rules");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [rightDrawerTab, setRightDrawerTab] = useState<"rules" | "brief" | "critique" | "matrix" | "schedule">("rules");
  const [storageStatus, setStorageStatus] = useState<"saved" | "saving" | "offline">("offline");
  const [activeModal, setActiveModal] = useState<StudioModalType>("none");
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // Ensure dimensions and sectionCuts arrays exist in workspace
  const workspaceWithDefaults = useMemo(() => ({
    ...workspace,
    dimensions: workspace.dimensions || [],
    sectionCuts: workspace.sectionCuts || [],
  }), [workspace]);

  // Undo/Redo History
  const historyRef = useRef<StudioWorkspaceFile[]>([DEFAULT_WORKSPACE]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadWorkspaceFromStorage();
        if (saved && saved.project && saved.elements && mounted) {
          setWorkspace(saved);
          historyRef.current = [saved];
          historyIndexRef.current = 0;
          setStorageStatus("saved");
        } else {
          setStorageStatus("saved");
        }
      } catch (err) {
        console.warn("Storage load error", err);
        setStorageStatus("offline");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Save to IndexedDB (debounced)
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setStorageStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await saveWorkspaceToStorage(workspace);
        setStorageStatus("saved");
      } catch (e) {
        setStorageStatus("offline");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [workspace]);

  // Push history snapshot on changes
  const pushHistory = useCallback((nextState: StudioWorkspaceFile) => {
    const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (currentHist.length > 30) {
      currentHist.shift();
    }
    currentHist.push(nextState);
    historyRef.current = currentHist;
    historyIndexRef.current = currentHist.length - 1;
  }, []);

  const setWorkspaceWithHistory = useCallback((updater: (prev: StudioWorkspaceFile) => StudioWorkspaceFile) => {
    setWorkspace((prev) => {
      const next = updater(prev);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setWorkspace(targetState);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setWorkspace(targetState);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Active Sub-board
  const activeBoard = useMemo(() => {
    return (
      workspace.subBoards.find((b) => b.id === workspace.activeBoardId) ||
      workspace.subBoards[0] || {
        id: "board-01",
        name: "Master Project",
        category: "program" as const,
        createdAt: Date.now(),
        pan: { x: 0, y: 0 },
        zoom: 1,
      }
    );
  }, [workspace.subBoards, workspace.activeBoardId]);

  // Filtered elements, connectors, dimensions, and section cuts for active board
  const boardElements = useMemo(() => {
    return workspace.elements.filter((el) => el.boardId === activeBoard.id);
  }, [workspace.elements, activeBoard.id]);

  const boardConnectors = useMemo(() => {
    return (workspace.connectors || []).filter((c) => c.boardId === activeBoard.id);
  }, [workspace.connectors, activeBoard.id]);

  const boardDimensions = useMemo(() => {
    return (workspace.dimensions || []).filter((d) => d.boardId === activeBoard.id);
  }, [workspace.dimensions, activeBoard.id]);

  const boardSectionCuts = useMemo(() => {
    return (workspace.sectionCuts || []).filter((s) => s.boardId === activeBoard.id);
  }, [workspace.sectionCuts, activeBoard.id]);

  // Dimension operations
  const addDimension = useCallback(
    (dim: Omit<DimensionString, "id" | "boardId">): string => {
      const id = `dim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newDim: DimensionString = {
        ...dim,
        id,
        boardId: activeBoard.id,
      };
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        dimensions: [...(prev.dimensions || []), newDim],
      }));
      return id;
    },
    [activeBoard.id, setWorkspaceWithHistory]
  );

  const removeDimension = useCallback(
    (id: string) => {
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        dimensions: (prev.dimensions || []).filter((d) => d.id !== id),
      }));
    },
    [setWorkspaceWithHistory]
  );

  const clearDimensions = useCallback(() => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      dimensions: (prev.dimensions || []).filter((d) => d.boardId !== activeBoard.id),
    }));
  }, [activeBoard.id, setWorkspaceWithHistory]);

  // Section Cut operations
  const addSectionCut = useCallback(
    (cut: Omit<SectionCutLine, "id" | "boardId">): string => {
      const id = `cut-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newCut: SectionCutLine = {
        ...cut,
        id,
        boardId: activeBoard.id,
      };
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        sectionCuts: [...(prev.sectionCuts || []), newCut],
      }));
      return id;
    },
    [activeBoard.id, setWorkspaceWithHistory]
  );

  const removeSectionCut = useCallback(
    (id: string) => {
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        sectionCuts: (prev.sectionCuts || []).filter((s) => s.id !== id),
      }));
    },
    [setWorkspaceWithHistory]
  );

  // Auto-Cluster Layout simulation
  const autoClusterLayout = useCallback(() => {
    const activeElems = workspace.elements.filter((el) => el.boardId === activeBoard.id);
    const activeConns = (workspace.connectors || []).filter((c) => c.boardId === activeBoard.id);
    const newPositions = computeForceClusterLayout(activeElems, activeConns, 80);

    if (newPositions.size > 0) {
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => {
          if (newPositions.has(el.id)) {
            const pos = newPositions.get(el.id)!;
            return { ...el, x: pos.x, y: pos.y };
          }
          return el;
        }),
      }));
    }
  }, [workspace.elements, workspace.connectors, activeBoard.id, setWorkspaceWithHistory]);

  // Architectural Metrics & Offline CAD Rules
  const metrics = useMemo(() => {
    return computeArchitecturalMetrics(workspace.elements, workspace.project);
  }, [workspace.elements, workspace.project]);

  const spatialIssues = useMemo(() => {
    return runOfflineCadRuleChecker(workspace.elements, workspace.connectors, workspace.project);
  }, [workspace.elements, workspace.connectors, workspace.project]);

  // Operations
  const setProject = useCallback((update: Partial<ProjectMetadata>) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      project: { ...prev.project, ...update, updatedAt: Date.now() },
    }));
  }, [setWorkspaceWithHistory]);

  const setScale = useCallback((scale: ScaleRatio) => {
    setProject({ scale });
  }, [setProject]);

  const setActiveBoardId = useCallback((boardId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      activeBoardId: boardId,
    }));
    setSelectedElementIds([]);
    setConnectingSourceId(null);
  }, []);

  const addSubBoard = useCallback((name: string, category: SubBoard["category"] = "program") => {
    const newBoard: SubBoard = {
      id: `board-${Date.now()}`,
      name: name.trim() || `Sub-Board 0${workspace.subBoards.length + 1}`,
      category,
      createdAt: Date.now(),
      pan: { x: 50, y: 50 },
      zoom: 1,
    };
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      subBoards: [...prev.subBoards, newBoard],
      activeBoardId: newBoard.id,
    }));
  }, [setWorkspaceWithHistory, workspace.subBoards.length]);

  const removeSubBoard = useCallback((boardId: string) => {
    setWorkspaceWithHistory((prev) => {
      if (prev.subBoards.length <= 1) return prev;
      const remaining = prev.subBoards.filter((b) => b.id !== boardId);
      const nextActiveId = prev.activeBoardId === boardId ? remaining[0].id : prev.activeBoardId;
      return {
        ...prev,
        subBoards: remaining,
        activeBoardId: nextActiveId,
        elements: prev.elements.filter((el) => el.boardId !== boardId),
        connectors: prev.connectors.filter((c) => c.boardId !== boardId),
      };
    });
  }, [setWorkspaceWithHistory]);

  const renameSubBoard = useCallback((boardId: string, name: string) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      subBoards: prev.subBoards.map((b) => (b.id === boardId ? { ...b, name } : b)),
    }));
  }, [setWorkspaceWithHistory]);

  const updateBoardViewport = useCallback((boardId: string, pan: { x: number; y: number }, zoom: number) => {
    setWorkspace((prev) => ({
      ...prev,
      subBoards: prev.subBoards.map((b) => (b.id === boardId ? { ...b, pan, zoom } : b)),
    }));
  }, []);

  const toggleSelectElement = useCallback((id: string, multi = false) => {
    setSelectedElementIds((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      }
      return prev.includes(id) && prev.length === 1 ? [] : [id];
    });
  }, []);

  // Element CRUD with Smart Proximity Placement
  const addElement = useCallback(
    (element: Partial<CanvasElement> & { type: CanvasElement["type"] }): string => {
      const id = `elem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const activeBoardElements = workspace.elements.filter((e) => e.boardId === activeBoard.id);

      let targetX = element.x;
      let targetY = element.y;

      // Smart Placement Algorithm: If x/y not provided, position intelligently near selected or last added element
      if (targetX === undefined || targetY === undefined) {
        const selectedEl = selectedElementIds.length > 0
          ? activeBoardElements.find((e) => e.id === selectedElementIds[selectedElementIds.length - 1])
          : null;
        
        const referenceEl = selectedEl || (activeBoardElements.length > 0 ? activeBoardElements[activeBoardElements.length - 1] : null);

        if (referenceEl) {
          // Standard architectural clearance offset (40px horizontally or 30px vertically)
          const candidateX = referenceEl.x + referenceEl.width + 40;
          const candidateY = referenceEl.y;

          // Check if space is occupied by another element
          const isOccupied = activeBoardElements.some(
            (e) => Math.hypot(e.x - candidateX, e.y - candidateY) < 60
          );

          if (!isOccupied) {
            targetX = candidateX;
            targetY = candidateY;
          } else {
            targetX = referenceEl.x;
            targetY = referenceEl.y + referenceEl.height + 40;
          }
        } else {
          // Centered in current viewport view
          const currentPan = activeBoard.pan || { x: 0, y: 0 };
          const currentZoom = activeBoard.zoom || 1;
          targetX = Math.round((-currentPan.x + 350) / currentZoom);
          targetY = Math.round((-currentPan.y + 250) / currentZoom);
        }
      }

      const defaultWidth = element.type === "level_column" ? 320 : element.type === "room_bubble" ? 220 : 260;
      const defaultHeight = element.type === "level_column" ? 480 : element.type === "room_bubble" ? 110 : 180;

      const baseEl: CanvasElement = {
        id,
        type: element.type,
        x: targetX,
        y: targetY,
        width: element.width ?? defaultWidth,
        height: element.height ?? defaultHeight,
        zIndex: element.zIndex ?? 1,
        boardId: element.boardId ?? activeBoard.id,
        ...element,
      } as CanvasElement;

      setWorkspaceWithHistory((prev) => ({
        ...prev,
        elements: [...prev.elements, baseEl],
      }));
      setSelectedElementIds([id]);
      setSelectedConnectorId(null);
      return id;
    },
    [setWorkspaceWithHistory, activeBoard, workspace.elements, selectedElementIds]
  );

  const updateElement = useCallback((id: string, update: Partial<CanvasElement>) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? ({ ...el, ...update } as CanvasElement) : el)),
    }));
  }, [setWorkspaceWithHistory]);

  const updateElementPosition = useCallback((id: string, x: number, y: number) => {
    setWorkspace((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, x, y } : el)),
    }));
  }, []);

  const removeElement = useCallback((id: string) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
      connectors: prev.connectors.filter((c) => c.sourceId !== id && c.targetId !== id),
    }));
    setSelectedElementIds((prev) => prev.filter((i) => i !== id));
  }, [setWorkspaceWithHistory]);

  const moveRoomToColumn = useCallback((roomId: string, targetColumnId: string | null) => {
    setWorkspaceWithHistory((prev) => {
      const room = prev.elements.find((e) => e.id === roomId && e.type === "room_bubble") as RoomElement | undefined;
      if (!room) return prev;

      return {
        ...prev,
        elements: prev.elements.map((el) => {
          if (el.id === roomId) {
            return { ...el, parentColumnId: targetColumnId };
          }
          if (el.type === "level_column") {
            const col = el as LevelColumnElement;
            let updatedRooms = col.roomIds.filter((id) => id !== roomId);
            if (col.id === targetColumnId) {
              updatedRooms.push(roomId);
            }
            return { ...col, roomIds: updatedRooms };
          }
          return el;
        }),
      };
    });
  }, [setWorkspaceWithHistory]);

  const duplicateSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    setWorkspaceWithHistory((prev) => {
      const selected = prev.elements.filter((e) => selectedElementIds.includes(e.id));
      const newIds: string[] = [];
      const duplicated = selected.map((el) => {
        const newId = `elem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        newIds.push(newId);
        return {
          ...el,
          id: newId,
          x: el.x + 50,
          y: el.y + 50,
        };
      });
      return {
        ...prev,
        elements: [...prev.elements, ...duplicated],
      };
    });
  }, [selectedElementIds, setWorkspaceWithHistory]);

  const deleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0 && !selectedConnectorId) return;
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => !selectedElementIds.includes(e.id)),
      connectors: prev.connectors.filter(
        (c) =>
          c.id !== selectedConnectorId &&
          !selectedElementIds.includes(c.sourceId) &&
          !selectedElementIds.includes(c.targetId)
      ),
    }));
    setSelectedElementIds([]);
    setSelectedConnectorId(null);
  }, [selectedElementIds, selectedConnectorId, setWorkspaceWithHistory]);

  const bringToFront = useCallback((id: string) => {
    setWorkspaceWithHistory((prev) => {
      const maxZ = Math.max(...prev.elements.map((e) => e.zIndex || 1), 1);
      return {
        ...prev,
        elements: prev.elements.map((e) => (e.id === id ? { ...e, zIndex: maxZ + 1 } : e)),
      };
    });
  }, [setWorkspaceWithHistory]);

  const sendToBack = useCallback((id: string) => {
    setWorkspaceWithHistory((prev) => {
      const minZ = Math.min(...prev.elements.map((e) => e.zIndex || 1), 1);
      return {
        ...prev,
        elements: prev.elements.map((e) => (e.id === id ? { ...e, zIndex: Math.max(0, minZ - 1) } : e)),
      };
    });
  }, [setWorkspaceWithHistory]);

  // Connectors
  const addConnector = useCallback(
    (sourceId: string, targetId: string, type: ConnectorType = "direct_access", label?: string) => {
      if (sourceId === targetId) return;
      // Prevent duplicate identical connectors
      const existing = (workspace.connectors || []).find(
        (c) =>
          c.boardId === activeBoard.id &&
          ((c.sourceId === sourceId && c.targetId === targetId) ||
            (c.sourceId === targetId && c.targetId === sourceId))
      );
      if (existing) {
        setSelectedConnectorId(existing.id);
        setConnectingSourceId(null);
        setActiveTool("select");
        return;
      }

      const newId = `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newConn: ConnectorLink = {
        id: newId,
        sourceId,
        targetId,
        type,
        label,
        boardId: activeBoard.id,
      };
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        connectors: [...prev.connectors, newConn],
      }));
      setConnectingSourceId(null);
      setSelectedConnectorId(newId);
      setActiveTool("select");
    },
    [setWorkspaceWithHistory, activeBoard.id, workspace.connectors]
  );

  const removeConnector = useCallback((id: string) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      connectors: prev.connectors.filter((c) => c.id !== id),
    }));
    if (selectedConnectorId === id) setSelectedConnectorId(null);
  }, [selectedConnectorId, setWorkspaceWithHistory]);

  const updateConnector = useCallback((id: string, update: Partial<ConnectorLink>) => {
    setWorkspaceWithHistory((prev) => ({
      ...prev,
      connectors: prev.connectors.map((c) => (c.id === id ? { ...c, ...update } : c)),
    }));
  }, [setWorkspaceWithHistory]);

  const reconnectConnector = useCallback(
    (connectorId: string, newSourceId?: string, newTargetId?: string) => {
      setWorkspaceWithHistory((prev) => ({
        ...prev,
        connectors: prev.connectors.map((c) => {
          if (c.id === connectorId) {
            return {
              ...c,
              sourceId: newSourceId || c.sourceId,
              targetId: newTargetId || c.targetId,
            };
          }
          return c;
        }),
      }));
    },
    [setWorkspaceWithHistory]
  );

  // Quick Directional Branching (Spawns a new adjacent connected bubble)
  const addConnectedBranch = useCallback(
    (
      sourceId: string,
      options?: {
        category?: RoomCategory;
        direction?: "right" | "bottom" | "left" | "top";
        name?: string;
        targetAreaM2?: number;
        connectorType?: ConnectorType;
      }
    ): string => {
      const sourceEl = workspace.elements.find((e) => e.id === sourceId);
      if (!sourceEl) return "";

      const direction = options?.direction || "right";
      const cat = options?.category || (sourceEl.type === "room_bubble" ? (sourceEl as RoomElement).category : "public");
      const name = options?.name || "Connected Space";
      const area = options?.targetAreaM2 || 25;
      const widthM = Math.round(Math.sqrt(area) * 10) / 10;
      const lengthM = Math.round((area / widthM) * 10) / 10;

      let newX = sourceEl.x + sourceEl.width + 60;
      let newY = sourceEl.y;

      if (direction === "bottom") {
        newX = sourceEl.x;
        newY = sourceEl.y + sourceEl.height + 50;
      } else if (direction === "left") {
        newX = sourceEl.x - 220 - 60;
        newY = sourceEl.y;
      } else if (direction === "top") {
        newX = sourceEl.x;
        newY = sourceEl.y - 110 - 50;
      }

      const newRoomId = `elem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newRoom: RoomElement = {
        id: newRoomId,
        type: "room_bubble",
        name,
        category: cat,
        targetAreaM2: area,
        widthM,
        lengthM,
        daylightReq: "diffuse_north",
        acousticLevel: "moderate",
        x: newX,
        y: newY,
        width: 220,
        height: 110,
        zIndex: (sourceEl.zIndex || 1) + 1,
        boardId: activeBoard.id,
      };

      const connId = `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newConn: ConnectorLink = {
        id: connId,
        sourceId,
        targetId: newRoomId,
        type: options?.connectorType || activeConnectorType,
        boardId: activeBoard.id,
      };

      setWorkspaceWithHistory((prev) => ({
        ...prev,
        elements: [...prev.elements, newRoom],
        connectors: [...prev.connectors, newConn],
      }));

      setSelectedElementIds([newRoomId]);
      setSelectedConnectorId(null);
      return newRoomId;
    },
    [workspace.elements, activeBoard.id, activeConnectorType, setWorkspaceWithHistory]
  );

  // Export & Import
  const exportStudio = useCallback(() => {
    downloadJsonFile(
      `${workspace.project.name.toLowerCase().replace(/\s+/g, "_")}.studio`,
      workspace
    );
  }, [workspace]);

  const importStudio = useCallback(async (file: File) => {
    try {
      const imported = await parseUploadedStudioFile(file);
      setWorkspace(imported);
      historyRef.current = [imported];
      historyIndexRef.current = 0;
      setSelectedElementIds([]);
    } catch (err: any) {
      alert(`Import Failed: ${err.message}`);
    }
  }, []);

  const resetToDemo = useCallback(() => {
    setWorkspace(DEFAULT_WORKSPACE);
    historyRef.current = [DEFAULT_WORKSPACE];
    historyIndexRef.current = 0;
    setSelectedElementIds([]);
  }, []);

  const value = {
    project: workspace.project,
    subBoards: workspace.subBoards,
    activeBoardId: workspace.activeBoardId,
    activeBoard,
    elements: workspace.elements,
    boardElements,
    connectors: workspace.connectors || [],
    boardConnectors,
    dimensions: workspaceWithDefaults.dimensions,
    boardDimensions,
    sectionCuts: workspaceWithDefaults.sectionCuts,
    boardSectionCuts,
    selectedElementIds,
    activeTool,
    activeConnectorType,
    connectingSourceId,
    gridMode,
    snapToGrid,
    gridSnapM,
    aiEngineMode,
    customApiKey,
    ollamaUrl,
    isRightDrawerOpen,
    rightDrawerTab,
    metrics,
    spatialIssues,
    storageStatus,
    canUndo,
    canRedo,
    activeModal,
    selectedConnectorId,
    setSelectedConnectorId,
    reconnectConnector,
    addConnectedBranch,
    setProject,
    setActiveTool,
    setActiveConnectorType,
    setConnectingSourceId,
    setGridMode,
    setSnapToGrid,
    setGridSnapM,
    setScale,
    setAiEngineMode,
    setCustomApiKey,
    setOllamaUrl,
    setIsRightDrawerOpen,
    setRightDrawerTab,
    setSelectedElementIds,
    toggleSelectElement,
    setActiveModal,
    setActiveBoardId,
    addSubBoard,
    removeSubBoard,
    renameSubBoard,
    updateBoardViewport,
    addElement,
    updateElement,
    updateElementPosition,
    removeElement,
    moveRoomToColumn,
    duplicateSelected,
    deleteSelected,
    bringToFront,
    sendToBack,
    addConnector,
    removeConnector,
    updateConnector,
    addDimension,
    removeDimension,
    clearDimensions,
    addSectionCut,
    removeSectionCut,
    autoClusterLayout,
    undo,
    redo,
    exportStudio,
    importStudio,
    resetToDemo,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
};
