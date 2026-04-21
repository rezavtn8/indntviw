import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { IndentationData, ColorScheme } from '@/types/indentation';
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
  globalColorScheme: ColorScheme;
  setGlobalColorScheme: (scheme: ColorScheme) => void;
  globalCustomMin: number | null;
  globalCustomMax: number | null;
  setGlobalCustomMin: (val: number | null) => void;
  setGlobalCustomMax: (val: number | null) => void;
  resetGlobalRange: () => void;
  autoFitGlobalRangeToAllSamples: (mode?: 'robust' | 'absolute') => void;
  
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
  overrideColorRange: boolean;
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
  renameSession: (sessionId: string, newName: string) => void;
  reorderSessions: (fromIndex: number, toIndex: number) => void;
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
  
  // Global color scheme + range (shared across all sessions unless overridden)
  const [globalColorScheme, setGlobalColorScheme] = useState<ColorScheme>('viridis');
  const [globalCustomMin, setGlobalCustomMin] = useState<number | null>(null);
  const [globalCustomMax, setGlobalCustomMax] = useState<number | null>(null);
  
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
  
  // Color scheme + range: per-session value when override is on, otherwise the global value
  const overrideColorRange = activeSession?.overrideColorRange ?? false;
  const colorScheme = overrideColorRange
    ? (activeSession?.colorScheme || globalColorScheme)
    : globalColorScheme;
  const customMin = overrideColorRange ? (activeSession?.customMin ?? null) : globalCustomMin;
  const customMax = overrideColorRange ? (activeSession?.customMax ?? null) : globalCustomMax;
  
  const zones = activeSession?.zones || [];
  const selectedZoneId = activeSession?.selectedZoneId || null;
  const comparedZoneIds = activeSession?.comparedZoneIds || [];
  const selectedPointIds = activeSession?.selectedPointIds || [];
  const highlightedOutliers = activeSession?.highlightedOutliers || [];
  const exportSelectedPointIds = activeSession?.exportSelectedPointIds || [];

  // Reset global range to data-driven (null = auto)
  const resetGlobalRange = useCallback(() => {
    setGlobalCustomMin(null);
    setGlobalCustomMax(null);
  }, []);

  // Auto-fit global range to encompass all open samples for the current global property.
  // Uses 1st-99th percentile by default to ignore extreme outliers that wash out the color scale.
  const autoFitGlobalRangeToAllSamples = useCallback((mode: 'robust' | 'absolute' = 'robust') => {
    if (fileSessions.length === 0) {
      toast.error('No samples open');
      return;
    }
    const allValues: number[] = [];
    let samplesWithProperty = 0;
    let samplesMissingProperty = 0;
    let propertyNameForToast = globalSelectedProperty;

    fileSessions.forEach(s => {
      const prop = s.data.propertyNames.includes(globalSelectedProperty)
        ? globalSelectedProperty
        : null;
      if (!prop) {
        samplesMissingProperty += 1;
        return;
      }
      let added = 0;
      s.data.points.forEach(p => {
        const v = p.properties[prop];
        if (v !== undefined && v !== null && !isNaN(v)) {
          allValues.push(v);
          added += 1;
        }
      });
      if (added > 0) samplesWithProperty += 1;
    });

    if (allValues.length === 0) {
      toast.error(`No "${propertyNameForToast}" values found across open samples`);
      return;
    }

    let min: number;
    let max: number;
    if (mode === 'absolute' || allValues.length < 20) {
      min = Math.min(...allValues);
      max = Math.max(...allValues);
    } else {
      const sorted = [...allValues].sort((a, b) => a - b);
      const percentile = (p: number) => {
        const idx = (sorted.length - 1) * p;
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi) return sorted[lo];
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
      };
      min = percentile(0.01);
      max = percentile(0.99);
      // Guard against degenerate ranges
      if (min === max) {
        min = sorted[0];
        max = sorted[sorted.length - 1];
      }
    }

    if (!isFinite(min) || !isFinite(max) || min === max) {
      toast.error('Could not compute a valid range');
      return;
    }

    setGlobalCustomMin(min);
    setGlobalCustomMax(max);

    // Clear per-session overrides so the synced range actually applies everywhere
    setFileSessions(prev =>
      prev.map(s =>
        s.overrideColorRange
          ? { ...s, overrideColorRange: false, customMin: null, customMax: null }
          : s
      )
    );

    const fmt = (v: number) =>
      Math.abs(v) >= 1000 || (Math.abs(v) > 0 && Math.abs(v) < 0.01)
        ? v.toExponential(2)
        : v.toFixed(2);
    const modeLabel = mode === 'robust' ? '1–99%' : 'min–max';
    const skipped = samplesMissingProperty > 0 ? ` (${samplesMissingProperty} skipped)` : '';
    toast.success(
      `${propertyNameForToast}: ${fmt(min)} – ${fmt(max)} across ${samplesWithProperty} sample${samplesWithProperty > 1 ? 's' : ''}${skipped} · ${modeLabel}`
    );
  }, [fileSessions, globalSelectedProperty]);

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
      overlayImageDataUrl: (ps as any).overlayImageDataUrl ?? null,
      overlayTransform: (ps as any).overlayTransform ?? { offsetX: 0, offsetY: 0, scale: 1, rotation: 0, opacity: 80 },
      overlayPointSettings: (ps as any).overlayPointSettings ?? { sizeMultiplier: 1, opacity: 90 },
      overlayPointsTransform: (ps as any).overlayPointsTransform ?? { offsetX: 0, offsetY: 0, scale: 1, opacity: 90, xStretch: 1, yStretch: 1 },
      overlayActiveLayer: (ps as any).overlayActiveLayer ?? 'points',
      overlayPointsVisible: (ps as any).overlayPointsVisible ?? true,
      overrideColorRange: (ps as any).overrideColorRange ?? false,
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

  const renameSession = useCallback((sessionId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFileSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, fileName: trimmed } : s
    ));
  }, []);

  const reorderSessions = useCallback((fromIndex: number, toIndex: number) => {
    setFileSessions(prev => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 || fromIndex >= prev.length ||
        toIndex < 0 || toIndex >= prev.length
      ) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

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
    globalColorScheme,
    setGlobalColorScheme,
    globalCustomMin,
    globalCustomMax,
    setGlobalCustomMin,
    setGlobalCustomMax,
    resetGlobalRange,
    autoFitGlobalRangeToAllSamples,
    groups,
    setGroups,
    data,
    originalData,
    selectedProperty,
    colorScheme,
    customMin,
    customMax,
    overrideColorRange,
    zones,
    selectedZoneId,
    comparedZoneIds,
    selectedPointIds,
    highlightedOutliers,
    exportSelectedPointIds,
    handleDataLoaded,
    handleSelectSession,
    handleCloseSession,
    renameSession,
    reorderSessions,
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
