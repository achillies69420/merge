import { StudioWorkspaceFile } from "../types";

const DB_NAME = "ArchiCanvas_Studio_DB";
const STORE_NAME = "workspace_store";
const DB_VERSION = 1;
const WORKSPACE_KEY = "current_workspace";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspaceToStorage(workspace: StudioWorkspaceFile): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(workspace, WORKSPACE_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB save failed, falling back to localStorage", err);
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
      return true;
    } catch (localErr) {
      console.error("LocalStorage save also failed", localErr);
      return false;
    }
  }
}

export async function loadWorkspaceFromStorage(): Promise<StudioWorkspaceFile | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WORKSPACE_KEY);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as StudioWorkspaceFile);
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem(WORKSPACE_KEY);
          if (local) {
            try {
              resolve(JSON.parse(local));
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB load failed, trying localStorage", err);
    const local = localStorage.getItem(WORKSPACE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function downloadJsonFile(filename: string, data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".studio") ? filename : `${filename}.studio`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseUploadedStudioFile(file: File): Promise<StudioWorkspaceFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.project || !parsed.elements) {
          throw new Error("Invalid .studio file format. Missing project or elements metadata.");
        }
        resolve(parsed as StudioWorkspaceFile);
      } catch (err: any) {
        reject(new Error(err.message || "Failed to parse studio JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}
