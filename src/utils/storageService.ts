import { IndentationData, ColorScheme } from '@/types/indentation';
import { Zone } from '@/types/zones';
import { SampleGroup } from '@/components/analysis/SampleGrouping';

const DB_NAME = 'indentview-workspace';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'main';

// Persisted session structure (subset of FileSession).
//
// The overlay fields used to be missing here even though the loader read them
// back with `(ps as any).overlayImageDataUrl` — so micrograph registration was
// silently discarded on every reload.
export interface PersistedSession {
  id: string;
  fileName: string;
  data: IndentationData;
  originalData: IndentationData;
  zones: Zone[];
  colorScheme: ColorScheme;
  customMin: number | null;
  customMax: number | null;
  overrideColorRange?: boolean;
  overlayImageDataUrl?: string | null;
  overlayTransform?: unknown;
  overlayPointSettings?: unknown;
  overlayPointsTransform?: unknown;
  overlayActiveLayer?: string;
  overlayPointsVisible?: boolean;
}

export interface PersistedWorkspace {
  version: number;
  savedAt: number;
  sessions: PersistedSession[];
  activeSessionId: string | null;
  groups: SampleGroup[];
  globalSelectedProperty: string;
}

/**
 * Project the live FileSession down to what we persist, dropping transient
 * selection state. Single definition — this used to be duplicated in both
 * SessionContext and useWorkspacePersistence, and the two copies had drifted.
 */
export const toPersistedSession = (session: {
  id: string;
  fileName: string;
  data: IndentationData;
  originalData: IndentationData;
  zones: Zone[];
  colorScheme: ColorScheme;
  customMin: number | null;
  customMax: number | null;
  overrideColorRange?: boolean;
  overlayImageDataUrl?: string | null;
  overlayTransform?: unknown;
  overlayPointSettings?: unknown;
  overlayPointsTransform?: unknown;
  overlayActiveLayer?: string;
  overlayPointsVisible?: boolean;
}): PersistedSession => ({
  id: session.id,
  fileName: session.fileName,
  data: session.data,
  originalData: session.originalData,
  zones: session.zones,
  colorScheme: session.colorScheme,
  customMin: session.customMin,
  customMax: session.customMax,
  overrideColorRange: session.overrideColorRange,
  overlayImageDataUrl: session.overlayImageDataUrl,
  overlayTransform: session.overlayTransform,
  overlayPointSettings: session.overlayPointSettings,
  overlayPointsTransform: session.overlayPointsTransform,
  overlayActiveLayer: session.overlayActiveLayer,
  overlayPointsVisible: session.overlayPointsVisible,
});

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const storageService = {
  async saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.put(workspace, WORKSPACE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to save workspace:', error);
      throw error;
    }
  },

  async loadWorkspace(): Promise<PersistedWorkspace | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.get(WORKSPACE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to load workspace:', error);
      return null;
    }
  },

  async clearWorkspace(): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(WORKSPACE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      throw error;
    }
  },

  isIndexedDBAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  },
};
