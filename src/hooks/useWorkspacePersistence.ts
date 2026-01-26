import { useEffect, useRef, useCallback } from 'react';
import { storageService, PersistedWorkspace, PersistedSession } from '@/utils/storageService';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from '@/components/analysis/SampleGrouping';

const DEBOUNCE_MS = 1000;
const WORKSPACE_VERSION = 1;

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

  // Convert FileSession to PersistedSession (exclude transient state)
  const toPersistedSession = useCallback((session: FileSession): PersistedSession => ({
    id: session.id,
    fileName: session.fileName,
    data: session.data,
    originalData: session.originalData,
    zones: session.zones,
    colorScheme: session.colorScheme,
    customMin: session.customMin,
    customMax: session.customMax,
  }), []);

  // Save workspace
  const saveWorkspace = useCallback(async () => {
    if (!storageService.isIndexedDBAvailable()) return;
    if (fileSessions.length === 0) return;

    const workspace: PersistedWorkspace = {
      version: WORKSPACE_VERSION,
      savedAt: Date.now(),
      sessions: fileSessions.map(toPersistedSession),
      activeSessionId,
      groups,
      globalSelectedProperty,
    };

    // Check if anything changed (simple hash comparison)
    const hash = JSON.stringify({
      sessionIds: fileSessions.map(s => s.id),
      zones: fileSessions.map(s => s.zones.length),
      groups: groups.length,
      activeSessionId,
      globalSelectedProperty,
    });

    if (hash === lastSaveRef.current) return;
    lastSaveRef.current = hash;

    try {
      await storageService.saveWorkspace(workspace);
      console.log('[Persistence] Workspace saved');
    } catch (error) {
      console.error('[Persistence] Save failed:', error);
    }
  }, [fileSessions, activeSessionId, groups, globalSelectedProperty, toPersistedSession]);

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

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Sync save attempt (may not complete for large data)
      saveWorkspace();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
