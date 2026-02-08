import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { IndentationData } from '@/types/indentation';
import { FileSession, createFileSession, generateSessionId } from '@/types/fileSession';
import { SampleGroup } from '@/components/analysis/SampleGrouping';
import { parseTabSeparatedData } from '@/utils/dataParser';
import { useWorkspacePersistence } from '@/hooks/useWorkspacePersistence';
import { PersistedWorkspace, PersistedSession } from '@/utils/storageService';
import { storageService } from '@/utils/storageService';
import { saveProjectToFile, loadProjectFromFile } from '@/utils/projectFileService';
import { toast } from 'sonner';

interface SessionContextValue {
  // State
  fileSessions: FileSession[];
  activeSessionId: string | null;
  activeSession: FileSession | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Global settings (shared across all sessions)
  globalSelectedProperty: string;
  setGlobalSelectedProperty: (property: string) => void;
  
  // Treatment groups (lifted from CrossSamplePanel for persistence)
  groups: SampleGroup[];
  setGroups: (groups: SampleGroup[]) => void;
  
  // Derived data
  data: IndentationData | null;
  originalData: IndentationData | null;
  selectedProperty: string;
  colorScheme: FileSession['colorScheme'];
  customMin: number | null;
  customMax: number | null;
  zones: FileSession['zones'];
  selectedZoneId: string | null;
  comparedZoneIds: string[];
  selectedPointIds: number[];
  highlightedOutliers: number[];
  exportSelectedPointIds: number[];
  
  // Actions
  handleDataLoaded: (newData: IndentationData, fileName: string) => void;
  handleSelectSession: (sessionId: string) => void;
  handleCloseSession: (sessionId: string) => void;
  updateActiveSession: (updates: Partial<FileSession>) => void;
  clearWorkspace: () => Promise<void>;
  saveProjectFile: () => Promise<void>;
  loadProjectFile: (file: File) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSessions, setFileSessions] = useState<FileSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Global selected property (shared across all sessions)
  const [globalSelectedProperty, setGlobalSelectedProperty] = useState<string>('HIT');
  
  // Treatment groups (lifted from CrossSamplePanel for persistence)
  const [groups, setGroups] = useState<SampleGroup[]>([]);

  // Get active session
  const activeSession = useMemo(() => 
    fileSessions.find(s => s.id === activeSessionId) || null,
    [fileSessions, activeSessionId]
  );

  // Derived data from active session
  const data = activeSession?.data || null;
  const originalData = activeSession?.originalData || null;
  
  // Use global property, but fall back to first available if current property doesn't exist in this file
  const selectedProperty = useMemo(() => {
    if (!data) return globalSelectedProperty;
    if (data.propertyNames.includes(globalSelectedProperty)) {
      return globalSelectedProperty;
    }
    return data.propertyNames[0] || 'HIT';
  }, [data, globalSelectedProperty]);
  
  const colorScheme = activeSession?.colorScheme || 'viridis';
  const customMin = activeSession?.customMin ?? null;
  const customMax = activeSession?.customMax ?? null;
  const zones = activeSession?.zones || [];
  const selectedZoneId = activeSession?.selectedZoneId || null;
  const comparedZoneIds = activeSession?.comparedZoneIds || [];
  const selectedPointIds = activeSession?.selectedPointIds || [];
  const highlightedOutliers = activeSession?.highlightedOutliers || [];
  const exportSelectedPointIds = activeSession?.exportSelectedPointIds || [];

  // Handle workspace loaded from persistence
  const handleWorkspaceLoaded = useCallback((workspace: PersistedWorkspace) => {
    // Convert persisted sessions back to full FileSession objects
    const sessions: FileSession[] = workspace.sessions.map(ps => ({
      ...ps,
      selectedProperty: ps.data.propertyNames.includes(workspace.globalSelectedProperty) 
        ? workspace.globalSelectedProperty 
        : ps.data.propertyNames[0] || 'HIT',
      selectedZoneId: null,
      comparedZoneIds: [],
      selectedPointIds: [],
      highlightedOutliers: [],
      exportSelectedPointIds: [],
    }));

    setFileSessions(sessions);
    setActiveSessionId(workspace.activeSessionId);
    setGroups(workspace.groups || []);
    setGlobalSelectedProperty(workspace.globalSelectedProperty || 'HIT');
    setIsInitialized(true);
    
    toast.success(`Restored ${sessions.length} file${sessions.length > 1 ? 's' : ''} from last session`);
  }, []);

  // Load sample data only if no persisted data
  const hasAttemptedLoad = useRef(false);
  
  React.useEffect(() => {
    if (hasAttemptedLoad.current) return;
    hasAttemptedLoad.current = true;

    const loadInitialData = async () => {
      // Check if we have persisted data first
      try {
        const workspace = await storageService.loadWorkspace();
        if (workspace && workspace.sessions.length > 0) {
          handleWorkspaceLoaded(workspace);
          return;
        }
      } catch (error) {
        console.log('No persisted workspace, loading sample data');
      }

      // No persisted data, load sample
      try {
        const response = await fetch('/sample-data/sample_indentation.txt');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseTabSeparatedData(text);
          const sessionId = generateSessionId();
          const session = createFileSession(sessionId, 'sample_indentation.txt', parsed);
          setFileSessions([session]);
          setActiveSessionId(sessionId);
          setIsInitialized(true);
          toast.success(`Loaded sample data: ${parsed.points.length} points`);
        }
      } catch (error) {
        console.log('No sample data found, ready for file upload');
        setIsInitialized(true);
      }
    };

    loadInitialData();
  }, [handleWorkspaceLoaded]);

  // Use persistence hook
  useWorkspacePersistence({
    fileSessions,
    activeSessionId,
    groups,
    globalSelectedProperty,
    onWorkspaceLoaded: handleWorkspaceLoaded,
    isInitialized,
  });

  // Helper to update active session
  const updateActiveSession = useCallback((updates: Partial<FileSession>) => {
    if (!activeSessionId) return;
    setFileSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, ...updates } : s
    ));
  }, [activeSessionId]);

  const handleDataLoaded = useCallback((newData: IndentationData, fileName: string) => {
    const sessionId = generateSessionId();
    const session = createFileSession(sessionId, fileName, newData);
    setFileSessions(prev => [...prev, session]);
    setActiveSessionId(sessionId);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const handleCloseSession = useCallback((sessionId: string) => {
    setFileSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (sessionId === activeSessionId && newSessions.length > 0) {
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      } else if (newSessions.length === 0) {
        setActiveSessionId(null);
      }
      return newSessions;
    });
  }, [activeSessionId]);

  const clearWorkspace = useCallback(async () => {
    await storageService.clearWorkspace();
    setFileSessions([]);
    setActiveSessionId(null);
    setGroups([]);
    setGlobalSelectedProperty('HIT');
    toast.success('Workspace cleared');
  }, []);

  // Convert FileSession to PersistedSession
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

  const saveProjectFile = useCallback(async () => {
    if (fileSessions.length === 0) {
      toast.error('Nothing to save — open some files first');
      return;
    }
    try {
      const workspace: PersistedWorkspace = {
        version: 1,
        savedAt: Date.now(),
        sessions: fileSessions.map(toPersistedSession),
        activeSessionId,
        groups,
        globalSelectedProperty,
      };
      await saveProjectToFile(workspace);
      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    }
  }, [fileSessions, activeSessionId, groups, globalSelectedProperty, toPersistedSession]);

  const loadProjectFile = useCallback(async (file: File) => {
    try {
      const workspace = await loadProjectFromFile(file);
      handleWorkspaceLoaded(workspace);
      toast.success(`Project loaded — ${workspace.sessions.length} file${workspace.sessions.length > 1 ? 's' : ''} restored`);
    } catch (error: any) {
      console.error('Failed to load project:', error);
      toast.error(error?.message || 'Failed to load project file');
    }
  }, [handleWorkspaceLoaded]);

  const value: SessionContextValue = {
    fileSessions,
    activeSessionId,
    activeSession,
    isLoading,
    setIsLoading,
    globalSelectedProperty,
    setGlobalSelectedProperty,
    groups,
    setGroups,
    data,
    originalData,
    selectedProperty,
    colorScheme,
    customMin,
    customMax,
    zones,
    selectedZoneId,
    comparedZoneIds,
    selectedPointIds,
    highlightedOutliers,
    exportSelectedPointIds,
    handleDataLoaded,
    handleSelectSession,
    handleCloseSession,
    updateActiveSession,
    clearWorkspace,
    saveProjectFile,
    loadProjectFile,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
