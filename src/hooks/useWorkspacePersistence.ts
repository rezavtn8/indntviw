import { useEffect, useRef, useCallback } from 'react';
import { APP_VERSION } from '@/version';
import { storageService, PersistedWorkspace, toPersistedSession } from '@/utils/storageService';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from '@/components/analysis/SampleGrouping';

const DEBOUNCE_MS = 1000;
const WORKSPACE_VERSION = 1;

/**
 * Cheap change signature for the workspace.
 *
 * The previous version hashed only `{sessionIds, zones.length, groups.length,
 * activeSessionId, globalSelectedProperty}`. That meant deleting a point,
 * editing a point's value, reshaping or renaming a zone, or changing colours
 * all left the hash identical — so autosave decided nothing had changed and
 * the work was never written. This walks the mutable state that actually
 * matters, in O(points), which is fine behind the 1s debounce.
 */
function fingerprint(
  sessions: FileSession[],
  groups: SampleGroup[],
  activeSessionId: string | null,
  globalSelectedProperty: string,
): string {
  const parts: (string | number)[] = [
    activeSessionId ?? '-',
    globalSelectedProperty,
    groups.length,
  ];

  for (const g of groups) {
    parts.push(g.id, g.name, g.sessionIds.length, g.sessionIds.join('.'));
  }

  for (const s of sessions) {
    parts.push(s.id, s.fileName, s.colorScheme, s.customMin ?? 'n', s.customMax ?? 'n');
    parts.push(s.overrideColorRange ? 1 : 0);
    parts.push(s.overlayImageDataUrl ? s.overlayImageDataUrl.length : 0);
    parts.push(JSON.stringify(s.overlayTransform ?? null));
    parts.push(JSON.stringify(s.overlayPointsTransform ?? null));
    parts.push(JSON.stringify(s.overlayPointSettings ?? null));
    parts.push(s.overlayActiveLayer ?? '-', s.overlayPointsVisible ? 1 : 0);

    // Zone geometry and membership
    parts.push(s.zones.length);
    for (const z of s.zones) {
      parts.push(z.id, z.name, z.color, z.memberPointIds.length, z.points.length);
    }

    // Point data: a running checksum catches edits, deletions and additions
    // without serialising the whole dataset on every keystroke.
    let idSum = 0;
    let coordSum = 0;
    let valueSum = 0;
    for (const p of s.data.points) {
      idSum += p.id;
      coordSum += p.x + p.y + p.z;
      for (const key in p.properties) {
        const v = p.properties[key];
        if (typeof v === 'number' && isFinite(v)) valueSum += v;
      }
    }
    parts.push(
      s.data.points.length,
      idSum,
      Math.round(coordSum * 1e6),
      Math.round(valueSum * 1e3),
    );
  }

  return parts.join('|');
}

interface UseWorkspacePersistenceProps {
  fileSessions: FileSession[];
  activeSessionId: string | null;
  groups: SampleGroup[];
  globalSelectedProperty: string;
  onWorkspaceLoaded: (workspace: PersistedWorkspace) => void;
  isInitialized: boolean;
}

export const useWorkspacePersistence = ({
  fileSessions,
  activeSessionId,
  groups,
  globalSelectedProperty,
  onWorkspaceLoaded,
  isInitialized,
}: UseWorkspacePersistenceProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSaveRef = useRef<string>('');

  // Save workspace
  const saveWorkspace = useCallback(async () => {
    if (!storageService.isIndexedDBAvailable()) return;
    if (fileSessions.length === 0) return;

    const workspace: PersistedWorkspace = {
      version: WORKSPACE_VERSION,
      appVersion: APP_VERSION,
      savedAt: Date.now(),
      sessions: fileSessions.map(toPersistedSession),
      activeSessionId,
      groups,
      globalSelectedProperty,
    };

    const hash = fingerprint(fileSessions, groups, activeSessionId, globalSelectedProperty);

    if (hash === lastSaveRef.current) return;
    lastSaveRef.current = hash;

    try {
      await storageService.saveWorkspace(workspace);
      console.log('[Persistence] Workspace saved');
    } catch (error) {
      console.error('[Persistence] Save failed:', error);
    }
  }, [fileSessions, activeSessionId, groups, globalSelectedProperty]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveWorkspace, DEBOUNCE_MS);
  }, [saveWorkspace]);

  // Load workspace on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadWorkspace = async () => {
      if (!storageService.isIndexedDBAvailable()) {
        console.log('[Persistence] IndexedDB not available');
        return;
      }

      try {
        const workspace = await storageService.loadWorkspace();
        if (workspace && workspace.sessions.length > 0) {
          console.log('[Persistence] Loaded workspace with', workspace.sessions.length, 'sessions');
          onWorkspaceLoaded(workspace);
        }
      } catch (error) {
        console.error('[Persistence] Load failed:', error);
      }
    };

    loadWorkspace();
  }, [onWorkspaceLoaded]);

  // Auto-save on state changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    debouncedSave();
  }, [fileSessions, activeSessionId, groups, globalSelectedProperty, isInitialized, debouncedSave]);

  // Flush pending saves when the page is hidden.
  //
  // `beforeunload` alone is unreliable here: IndexedDB writes are async and the
  // browser will not wait for them, so a pending debounce was routinely lost on
  // tab close. `visibilitychange -> hidden` fires early enough (tab switch,
  // minimise, navigation start) that the write actually completes, and it is
  // the only lifecycle event mobile browsers reliably deliver.
  useEffect(() => {
    const flush = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      void saveWorkspace();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [saveWorkspace]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveWorkspace,
  };
};
