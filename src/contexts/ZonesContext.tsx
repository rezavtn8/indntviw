import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Zone } from '@/types/zones';
import { useSession } from './SessionContext';
import { useVisualization } from './VisualizationContext';
import { generateZoneId, updateZoneBoundary, createZoneFromSelection } from '@/utils/zoneUtils';
import { toast } from 'sonner';

interface ZonesContextValue {
  // Derived zone data
  zones: Zone[];
  selectedZoneId: string | null;
  selectedZone: Zone | null;
  comparedZoneIds: string[];
  
  // Actions
  handleCreateZoneFromSelection: (pointIds?: number[]) => void;
  handleZoneUpdate: (zone: Zone) => void;
  handleZoneDelete: (zoneId: string) => void;
  handleSelectZone: (zoneId: string | null) => void;
  handleToggleCompare: (zoneId: string) => void;
}

const ZonesContext = createContext<ZonesContextValue | null>(null);

interface ZonesProviderProps {
  children: React.ReactNode;
  activeView: '2d' | '3d' | 'analysis' | 'export';
}

export const ZonesProvider: React.FC<ZonesProviderProps> = ({ children, activeView }) => {
  const { data, zones, selectedZoneId, comparedZoneIds, selectedPointIds, exportSelectedPointIds, updateActiveSession } = useSession();
  const { pointRadiusDataUnits } = useVisualization();

  const selectedZone = useMemo(() => 
    zones.find(z => z.id === selectedZoneId) || null, 
    [zones, selectedZoneId]
  );

  const handleCreateZoneFromSelection = useCallback((pointIds?: number[]) => {
    if (!data) return;
    const ids = pointIds || (activeView === 'export' ? exportSelectedPointIds : selectedPointIds);
    if (ids.length === 0) return;
    
    const newZone = createZoneFromSelection(
      ids,
      data.points,
      generateZoneId(),
      zones.length,
      undefined,
      pointRadiusDataUnits
    );
    
    if (!newZone) return;
    
    const newZones = [...zones, newZone];
    
    if (activeView === 'export') {
      updateActiveSession({ zones: newZones, selectedZoneId: newZone.id, exportSelectedPointIds: [] });
    } else {
      updateActiveSession({ zones: newZones, selectedZoneId: newZone.id, selectedPointIds: [] });
    }
    
    toast.success(`Created ${newZone.name} with ${ids.length} points`);
  }, [data, exportSelectedPointIds, selectedPointIds, zones, pointRadiusDataUnits, activeView, updateActiveSession]);

  const handleToggleCompare = useCallback((zoneId: string) => {
    const newComparedIds = comparedZoneIds.includes(zoneId)
      ? comparedZoneIds.filter(id => id !== zoneId)
      : comparedZoneIds.length >= 2
        ? [comparedZoneIds[1], zoneId]
        : [...comparedZoneIds, zoneId];
    updateActiveSession({ comparedZoneIds: newComparedIds });
  }, [comparedZoneIds, updateActiveSession]);

  const handleZoneUpdate = useCallback((zone: Zone) => {
    if (!data) {
      updateActiveSession({ zones: zones.map(z => z.id === zone.id ? zone : z) });
      return;
    }
    const updatedZone = updateZoneBoundary(zone, data.points, pointRadiusDataUnits);
    updateActiveSession({ zones: zones.map(z => z.id === zone.id ? updatedZone : z) });
  }, [data, pointRadiusDataUnits, zones, updateActiveSession]);

  const handleZoneDelete = useCallback((zoneId: string) => {
    const newZones = zones.filter(z => z.id !== zoneId);
    const newSelectedZoneId = selectedZoneId === zoneId ? null : selectedZoneId;
    updateActiveSession({ zones: newZones, selectedZoneId: newSelectedZoneId });
    toast.success('Zone deleted');
  }, [zones, selectedZoneId, updateActiveSession]);

  const handleSelectZone = useCallback((zoneId: string | null) => {
    updateActiveSession({ selectedZoneId: zoneId });
  }, [updateActiveSession]);

  const value: ZonesContextValue = {
    zones,
    selectedZoneId,
    selectedZone,
    comparedZoneIds,
    handleCreateZoneFromSelection,
    handleZoneUpdate,
    handleZoneDelete,
    handleSelectZone,
    handleToggleCompare,
  };

  return (
    <ZonesContext.Provider value={value}>
      {children}
    </ZonesContext.Provider>
  );
};

export const useZones = (): ZonesContextValue => {
  const context = useContext(ZonesContext);
  if (!context) {
    throw new Error('useZones must be used within a ZonesProvider');
  }
  return context;
};
