import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { IndentationData } from '@/types/indentation';
import { FileSession, createFileSession, generateSessionId } from '@/types/fileSession';
import { parseTabSeparatedData } from '@/utils/dataParser';
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
  
  // Derived data
  data: IndentationData | null;
  originalData: IndentationData | null;
  selectedProperty: string; // Now uses global
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
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileSessions, setFileSessions] = useState<FileSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Global selected property (shared across all sessions)
  const [globalSelectedProperty, setGlobalSelectedProperty] = useState<string>('HIT');

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
    // Check if the global property exists in this file's data
    if (data.propertyNames.includes(globalSelectedProperty)) {
      return globalSelectedProperty;
    }
    // Fall back to first available property
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

  // Load sample data on mount
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const response = await fetch('/sample-data/sample_indentation.txt');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseTabSeparatedData(text);
          const sessionId = generateSessionId();
          const session = createFileSession(sessionId, 'sample_indentation.txt', parsed);
          setFileSessions([session]);
          setActiveSessionId(sessionId);
          toast.success(`Loaded sample data: ${parsed.points.length} points`);
        }
      } catch (error) {
        console.log('No sample data found, ready for file upload');
      }
    };
    loadSampleData();
  }, []);

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

  const value: SessionContextValue = {
    fileSessions,
    activeSessionId,
    activeSession,
    isLoading,
    setIsLoading,
    globalSelectedProperty,
    setGlobalSelectedProperty,
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
