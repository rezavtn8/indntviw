import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { IndentationData, IndentationPoint } from '@/types/indentation';
import { useSession } from './SessionContext';
import { toast } from 'sonner';

interface EditorContextValue {
  // State
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editingPoint: IndentationPoint | null;
  setEditingPoint: (point: IndentationPoint | null) => void;
  isAddingPoint: boolean;
  setIsAddingPoint: (adding: boolean) => void;
  selectedPoint: IndentationPoint | null;
  setSelectedPoint: (point: IndentationPoint | null) => void;
  hoveredPoint: IndentationPoint | null;
  setHoveredPoint: (point: IndentationPoint | null) => void;
  
  // Derived
  selectedPoints: IndentationPoint[];
  hasChanges: boolean;
  
  // Actions
  handlePointEdit: (point: IndentationPoint) => void;
  handleSavePoint: (point: IndentationPoint) => void;
  handleDeletePoint: (pointId: number) => void;
  handleQuickDelete: (pointId: number) => void;
  handleAddNewPoint: () => void;
  handleRemoveOutliers: (pointIds: number[]) => void;
  handleResetData: () => void;
  handleLassoSelect: (pointIds: number[]) => void;
  handleExportSelected: () => void;
  handleSelectedPointIds: (pointIds: number[]) => void;
  handleExportSelectedPointIds: (pointIds: number[]) => void;
  handleHighlightOutliers: (pointIds: number[]) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, originalData, selectedPointIds, exportSelectedPointIds, updateActiveSession } = useSession();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IndentationPoint | null>(null);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<IndentationPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<IndentationPoint | null>(null);

  // Get selected points
  const selectedPoints = useMemo(() => {
    if (!data) return [];
    return data.points.filter(p => selectedPointIds.includes(p.id));
  }, [data, selectedPointIds]);

  // Efficient change detection
  const hasChanges = useMemo(() => {
    if (!data || !originalData) return false;
    if (data.points.length !== originalData.points.length) return true;
    return data.points !== originalData.points;
  }, [data, originalData]);

  // Recalculate statistics
  const recalculateStatistics = useCallback((points: IndentationPoint[], propertyNames: string[]): IndentationData['statistics'] => {
    const min: Record<string, number> = {};
    const max: Record<string, number> = {};
    const mean: Record<string, number> = {};
    const stdDev: Record<string, number> = {};

    propertyNames.forEach((prop) => {
      const values = points
        .map((p) => p.properties[prop])
        .filter((v) => v !== undefined && !isNaN(v));

      if (values.length === 0) {
        min[prop] = 0;
        max[prop] = 0;
        mean[prop] = 0;
        stdDev[prop] = 0;
        return;
      }

      min[prop] = Math.min(...values);
      max[prop] = Math.max(...values);
      mean[prop] = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[prop], 2), 0) / values.length;
      stdDev[prop] = Math.sqrt(variance);
    });

    ['X', 'Y', 'Z'].forEach((coord) => {
      const values = points.map((p) => coord === 'X' ? p.x : coord === 'Y' ? p.y : p.z);
      min[coord] = Math.min(...values);
      max[coord] = Math.max(...values);
      mean[coord] = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[coord], 2), 0) / values.length;
      stdDev[coord] = Math.sqrt(variance);
    });

    return { min, max, mean, stdDev };
  }, []);

  const handlePointEdit = useCallback((point: IndentationPoint) => {
    setEditingPoint(point);
    setIsAddingPoint(false);
  }, []);

  const handleSavePoint = useCallback((updatedPoint: IndentationPoint) => {
    if (!data) return;

    let newPoints: IndentationPoint[];
    
    if (isAddingPoint) {
      newPoints = [...data.points, { ...updatedPoint, id: data.points.length }];
    } else {
      newPoints = data.points.map(p => p.id === updatedPoint.id ? updatedPoint : p);
    }

    const newData: IndentationData = {
      ...data,
      points: newPoints,
      statistics: recalculateStatistics(newPoints, data.propertyNames),
    };

    updateActiveSession({ data: newData });
    setSelectedPoint(updatedPoint);
    setEditingPoint(null);
    setIsAddingPoint(false);
  }, [data, isAddingPoint, recalculateStatistics, updateActiveSession]);

  const handleDeletePoint = useCallback((pointId: number) => {
    if (!data) return;

    const newPoints = data.points
      .filter(p => p.id !== pointId)
      .map((p, i) => ({ ...p, id: i }));

    const newData: IndentationData = {
      ...data,
      points: newPoints,
      statistics: recalculateStatistics(newPoints, data.propertyNames),
    };

    updateActiveSession({ data: newData });
    setSelectedPoint(null);
    setEditingPoint(null);
  }, [data, recalculateStatistics, updateActiveSession]);

  // Quick delete with toast feedback (for edit mode click-to-delete)
  const handleQuickDelete = useCallback((pointId: number) => {
    if (!data) return;

    const pointToDelete = data.points.find(p => p.id === pointId);
    if (!pointToDelete) return;

    const newPoints = data.points
      .filter(p => p.id !== pointId)
      .map((p, i) => ({ ...p, id: i }));

    const newData: IndentationData = {
      ...data,
      points: newPoints,
      statistics: recalculateStatistics(newPoints, data.propertyNames),
    };

    updateActiveSession({ data: newData, selectedPointIds: selectedPointIds.filter(id => id !== pointId) });
    setSelectedPoint(null);
    toast.success(`Point deleted (${pointToDelete.x.toFixed(2)}, ${pointToDelete.y.toFixed(2)})`);
  }, [data, recalculateStatistics, updateActiveSession, selectedPointIds]);

  const handleAddNewPoint = useCallback(() => {
    if (!data) return;
    
    const avgX = data.statistics.mean['X'] || 0;
    const avgY = data.statistics.mean['Y'] || 0;
    const avgZ = data.statistics.mean['Z'] || 0;

    const properties: Record<string, number> = {};
    data.propertyNames.forEach(prop => {
      properties[prop] = data.statistics.mean[prop] || 0;
    });

    const newPoint: IndentationPoint = {
      id: data.points.length,
      x: avgX,
      y: avgY,
      z: avgZ,
      properties,
    };

    setEditingPoint(newPoint);
    setIsAddingPoint(true);
  }, [data]);

  const handleRemoveOutliers = useCallback((pointIds: number[]) => {
    if (!data) return;

    const newPoints = data.points
      .filter(p => !pointIds.includes(p.id))
      .map((p, i) => ({ ...p, id: i }));

    const newData: IndentationData = {
      ...data,
      points: newPoints,
      statistics: recalculateStatistics(newPoints, data.propertyNames),
    };

    updateActiveSession({ data: newData, highlightedOutliers: [] });
    setSelectedPoint(null);
  }, [data, recalculateStatistics, updateActiveSession]);

  const handleResetData = useCallback(() => {
    if (originalData) {
      updateActiveSession({ 
        data: originalData, 
        highlightedOutliers: [] 
      });
      setSelectedPoint(null);
      toast.success('Data reset to original');
    }
  }, [originalData, updateActiveSession]);

  const handleLassoSelect = useCallback((pointIds: number[]) => {
    updateActiveSession({ selectedPointIds: pointIds });
    if (pointIds.length > 0) {
      toast.success(`Selected ${pointIds.length} points`);
    }
  }, [updateActiveSession]);

  const handleExportSelected = useCallback(() => {
    if (!data || selectedPoints.length === 0) return;
    
    const headers = ['X', 'Y', 'Z', ...data.propertyNames];
    const rows = selectedPoints.map(p => [
      p.x.toString(),
      p.y.toString(),
      p.z.toString(),
      ...data.propertyNames.map(prop => (p.properties[prop] ?? '').toString())
    ]);
    
    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_points_${selectedPoints.length}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedPoints.length} selected points`);
  }, [data, selectedPoints]);

  const handleSelectedPointIds = useCallback((pointIds: number[]) => {
    updateActiveSession({ selectedPointIds: pointIds });
  }, [updateActiveSession]);

  const handleExportSelectedPointIds = useCallback((pointIds: number[]) => {
    updateActiveSession({ exportSelectedPointIds: pointIds });
  }, [updateActiveSession]);

  const handleHighlightOutliers = useCallback((pointIds: number[]) => {
    updateActiveSession({ highlightedOutliers: pointIds });
  }, [updateActiveSession]);

  const value: EditorContextValue = {
    isEditing,
    setIsEditing,
    editingPoint,
    setEditingPoint,
    isAddingPoint,
    setIsAddingPoint,
    selectedPoint,
    setSelectedPoint,
    hoveredPoint,
    setHoveredPoint,
    selectedPoints,
    hasChanges,
    handlePointEdit,
    handleSavePoint,
    handleDeletePoint,
    handleQuickDelete,
    handleAddNewPoint,
    handleRemoveOutliers,
    handleResetData,
    handleLassoSelect,
    handleExportSelected,
    handleSelectedPointIds,
    handleExportSelectedPointIds,
    handleHighlightOutliers,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextValue => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
