import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heatmap2D } from '@/components/visualization/Heatmap2D';
import { Scene3D } from '@/components/visualization/Scene3D';
import { ExportCanvas, ExportCanvasRef } from '@/components/visualization/ExportCanvas';
import { ColorLegend } from '@/components/visualization/ColorLegend';
import { PropertySelector } from '@/components/controls/PropertySelector';
import { ColorSchemeSelector } from '@/components/controls/ColorSchemeSelector';
import { RangeControls } from '@/components/controls/RangeControls';
import { FileUploader } from '@/components/controls/FileUploader';
import { ExportControls } from '@/components/controls/ExportControls';
import { VisualizationOptions } from '@/components/controls/VisualizationOptions';
import { ZoneToolbar, DrawingTool } from '@/components/controls/ZoneToolbar';
import { PointDetails } from '@/components/panels/PointDetails';
import { PointEditor } from '@/components/panels/PointEditor';
import { OutlierDetector } from '@/components/panels/OutlierDetector';
import { SelectionStatisticsPanel } from '@/components/panels/SelectionStatisticsPanel';
import { ZonePanel } from '@/components/panels/ZonePanel';
import { ZoneEditor } from '@/components/panels/ZoneEditor';
import { ExportOptionsPanel } from '@/components/panels/ExportOptionsPanel';
import { AnalysisPanel } from '@/components/panels/AnalysisPanel';
import { DistributionHistogram } from '@/components/visualization/DistributionHistogram';
import { FileTabs } from '@/components/FileTabs';
import { IndentationData, IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { Zone, ExportSettings, DEFAULT_EXPORT_SETTINGS } from '@/types/zones';
import { FileSession, createFileSession, generateSessionId } from '@/types/fileSession';
import { generateZoneId, updateZoneBoundary, createZoneFromSelection } from '@/utils/zoneUtils';
import { parseTabSeparatedData } from '@/utils/dataParser';
import { Grid2X2, Box, Edit3, Plus, Undo2, FileOutput, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export const IndentViewApp: React.FC = () => {
  // Multi-file session state
  const [fileSessions, setFileSessions] = useState<FileSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<IndentationPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<IndentationPoint | null>(null);
  const [activeView, setActiveView] = useState<'2d' | '3d' | 'analysis' | 'export'>('2d');
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IndentationPoint | null>(null);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  
  // Visualization options
  const [showContours, setShowContours] = useState(true);
  const [showInterpolation, setShowInterpolation] = useState(false);
  
  // Drawing tools
  const [heatmapDrawingTool, setHeatmapDrawingTool] = useState<DrawingTool>('select');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  
  // Export settings (global, not per-session)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  
  // Refs
  const visualizationRef = useRef<HTMLDivElement>(null);
  const exportCanvasRef = useRef<ExportCanvasRef>(null);

  // Get active session
  const activeSession = useMemo(() => 
    fileSessions.find(s => s.id === activeSessionId) || null,
    [fileSessions, activeSessionId]
  );

  // Helper to update active session
  const updateActiveSession = useCallback((updates: Partial<FileSession>) => {
    if (!activeSessionId) return;
    setFileSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, ...updates } : s
    ));
  }, [activeSessionId]);

  // Derived data from active session
  const data = activeSession?.data || null;
  const originalData = activeSession?.originalData || null;
  const selectedProperty = activeSession?.selectedProperty || 'HIT';
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

  // Calculate min/max for current property
  const { dataMin, dataMax, currentMin, currentMax } = useMemo(() => {
    if (!data || !selectedProperty) {
      return { dataMin: 0, dataMax: 100, currentMin: 0, currentMax: 100 };
    }

    const values = data.points
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      dataMin: min,
      dataMax: max,
      currentMin: customMin ?? min,
      currentMax: customMax ?? max,
    };
  }, [data, selectedProperty, customMin, customMax]);

  // Calculate spatial data bounds
  const dataBounds = useMemo(() => {
    if (!data || data.points.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }
    const xValues = data.points.map(p => p.x);
    const yValues = data.points.map(p => p.y);
    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues),
    };
  }, [data]);

  // Calculate point radius in data units
  const pointRadiusDataUnits = useMemo(() => {
    if (!data || data.points.length === 0) return 0.5;
    const xRange = dataBounds.xMax - dataBounds.xMin || 1;
    const yRange = dataBounds.yMax - dataBounds.yMin || 1;
    const avgDistance = Math.sqrt((xRange * yRange) / data.points.length);
    return avgDistance * 0.35;
  }, [data, dataBounds]);

  const handlePropertyChange = useCallback((property: string) => {
    updateActiveSession({ 
      selectedProperty: property, 
      customMin: null, 
      customMax: null 
    });
  }, [updateActiveSession]);

  const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
    updateActiveSession({ colorScheme: scheme });
  }, [updateActiveSession]);

  const handleResetRange = useCallback(() => {
    updateActiveSession({ customMin: null, customMax: null });
  }, [updateActiveSession]);

  const handleDataLoaded = useCallback((newData: IndentationData, fileName: string) => {
    const sessionId = generateSessionId();
    const session = createFileSession(sessionId, fileName, newData);
    setFileSessions(prev => [...prev, session]);
    setActiveSessionId(sessionId);
    setSelectedPoint(null);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedPoint(null);
  }, []);

  const handleCloseSession = useCallback((sessionId: string) => {
    setFileSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      // If closing active session, switch to another
      if (sessionId === activeSessionId && newSessions.length > 0) {
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      } else if (newSessions.length === 0) {
        setActiveSessionId(null);
      }
      return newSessions;
    });
    setSelectedPoint(null);
  }, [activeSessionId]);

  // Handle lasso selection
  const handleLassoSelect = useCallback((pointIds: number[]) => {
    updateActiveSession({ selectedPointIds: pointIds });
    if (pointIds.length > 0) {
      toast.success(`Selected ${pointIds.length} points`);
    }
  }, [updateActiveSession]);

  // Get selected points
  const selectedPoints = useMemo(() => {
    if (!data) return [];
    return data.points.filter(p => selectedPointIds.includes(p.id));
  }, [data, selectedPointIds]);

  // Export selected points
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

  // Edit point handlers
  const handlePointEdit = useCallback((point: IndentationPoint) => {
    setEditingPoint(point);
    setIsAddingPoint(false);
  }, []);

  const handleSavePoint = useCallback((updatedPoint: IndentationPoint) => {
    if (!data || !activeSession) return;

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
  }, [data, activeSession, isAddingPoint, recalculateStatistics, updateActiveSession]);

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

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  // Efficient change detection
  const hasChanges = useMemo(() => {
    if (!data || !originalData) return false;
    if (data.points.length !== originalData.points.length) return true;
    return data.points !== originalData.points;
  }, [data, originalData]);

  // Zone management handlers
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

  const handleSelectedPointIds = useCallback((pointIds: number[]) => {
    updateActiveSession({ selectedPointIds: pointIds });
  }, [updateActiveSession]);

  const handleExportSelectedPointIds = useCallback((pointIds: number[]) => {
    updateActiveSession({ exportSelectedPointIds: pointIds });
  }, [updateActiveSession]);

  const handleHighlightOutliers = useCallback((pointIds: number[]) => {
    updateActiveSession({ highlightedOutliers: pointIds });
  }, [updateActiveSession]);

  const selectedZone = useMemo(() => 
    zones.find(z => z.id === selectedZoneId) || null, 
    [zones, selectedZoneId]
  );

  // Export handler
  const handleExport = useCallback(async () => {
    if (!exportCanvasRef.current) return;
    
    setIsExporting(true);
    try {
      if (exportSettings.format === 'pdf') {
        const dataUrl = await exportCanvasRef.current.exportToDataURL('png', exportSettings.dpi);
        const pdf = new jsPDF({
          orientation: exportSettings.width > exportSettings.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [exportSettings.width, exportSettings.height],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, exportSettings.width, exportSettings.height);
        pdf.save(`${selectedProperty}_export.pdf`);
      } else {
        const dataUrl = await exportCanvasRef.current.exportToDataURL(
          exportSettings.format === 'svg' ? 'svg' : 'png',
          exportSettings.dpi
        );
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${selectedProperty}_export.${exportSettings.format}`;
        a.click();
      }
      toast.success(`Exported as ${exportSettings.format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [exportSettings, selectedProperty]);

  // Keyboard shortcuts for Export Studio
  useEffect(() => {
    if (activeView !== 'export') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'v': setDrawingTool('select'); break;
        case 'l': setDrawingTool('lasso'); break;
        case 'b': setDrawingTool('box'); break;
        case 'escape': handleExportSelectedPointIds([]); break;
        case 'delete':
        case 'backspace':
          if (selectedZoneId) handleZoneDelete(selectedZoneId);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, selectedZoneId, handleZoneDelete, handleExportSelectedPointIds]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">
              IndentView
            </h1>
            <span className="border border-border px-2 py-1 font-mono text-xs uppercase text-muted-foreground">
              v1.0
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {data && (
              <>
                <span className="font-mono text-sm text-muted-foreground">
                  {data.points.length} points
                </span>
                
                {hasChanges && (
                  <Button variant="outline" size="sm" onClick={handleResetData} className="gap-1">
                    <Undo2 className="w-4 h-4" />
                    Reset
                  </Button>
                )}
                
                <Button
                  variant={isEditing ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1"
                >
                  <Edit3 className="w-4 h-4" />
                  {isEditing ? 'Done Editing' : 'Edit Mode'}
                </Button>
                
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddNewPoint} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Point
                  </Button>
                )}
                
                <ExportControls
                  data={data}
                  visualizationRef={visualizationRef}
                  selectedProperty={selectedProperty}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* File Tabs */}
      <FileTabs
        sessions={fileSessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCloseSession={handleCloseSession}
      />

      <div className="flex-1 flex">
        {/* Sidebar - Hidden in Analysis view since it has its own controls */}
        {activeView !== 'analysis' && (
          <aside className="w-80 border-r-2 border-border bg-card p-4 space-y-6 overflow-y-auto">
            <FileUploader
              onDataLoaded={handleDataLoaded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            {data && (
              <>
                <PropertySelector
                  availableProperties={data.propertyNames}
                  selectedProperty={selectedProperty}
                  onPropertyChange={handlePropertyChange}
                />

                <ColorSchemeSelector
                  colorScheme={colorScheme}
                  onColorSchemeChange={handleColorSchemeChange}
                />

                <RangeControls
                  dataMin={dataMin}
                  dataMax={dataMax}
                  currentMin={currentMin}
                  currentMax={currentMax}
                  onMinChange={(val) => updateActiveSession({ customMin: val })}
                  onMaxChange={(val) => updateActiveSession({ customMax: val })}
                  onReset={handleResetRange}
                />

                {activeView === '2d' && (
                  <VisualizationOptions
                    showContours={showContours}
                    showInterpolation={showInterpolation}
                    onShowContoursChange={setShowContours}
                    onShowInterpolationChange={setShowInterpolation}
                  />
                )}

                <ColorLegend
                  selectedProperty={selectedProperty}
                  unit={getPropertyUnit(selectedProperty)}
                  colorScheme={colorScheme}
                  minValue={currentMin}
                  maxValue={currentMax}
                />

                {isEditing && (
                  <OutlierDetector
                    points={data.points}
                    selectedProperty={selectedProperty}
                    onRemoveOutliers={handleRemoveOutliers}
                    onHighlightOutliers={handleHighlightOutliers}
                  />
                )}

                {/* Only show stats in 2D/3D views, not in Export */}
                {(activeView === '2d' || activeView === '3d') && (
                  <SelectionStatisticsPanel
                    allPoints={data.points}
                    selectedPoints={selectedPoints}
                    selectedProperty={selectedProperty}
                    onExportSelected={selectedPoints.length > 0 ? handleExportSelected : undefined}
                    defaultOpen={false}
                  />
                )}

                {/* Zone Panel for 2D View */}
                {activeView === '2d' && zones.length > 0 && (
                  <div className="bg-card border-2 border-border rounded-lg">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider px-4 py-3 border-b border-border">
                      Zones ({zones.length})
                    </h3>
                    <ZonePanel
                      zones={zones}
                      selectedZoneId={selectedZoneId}
                      points={data.points}
                      selectedProperty={selectedProperty}
                      onSelectZone={handleSelectZone}
                      onUpdateZone={handleZoneUpdate}
                      onDeleteZone={handleZoneDelete}
                    />
                  </div>
                )}
              </>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* View Tabs */}
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as '2d' | '3d' | 'analysis' | 'export')}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="2d" className="font-mono text-sm gap-2">
                  <Grid2X2 className="w-4 h-4" />
                  2D Heatmap
                </TabsTrigger>
                <TabsTrigger value="3d" className="font-mono text-sm gap-2">
                  <Box className="w-4 h-4" />
                  3D View
                </TabsTrigger>
                <TabsTrigger value="analysis" className="font-mono text-sm gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="export" className="font-mono text-sm gap-2">
                  <FileOutput className="w-4 h-4" />
                  Export Studio
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Zone Toolbar - in 2D view */}
          {activeView === '2d' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar
                activeTool={heatmapDrawingTool}
                onToolChange={setHeatmapDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={() => handleCreateZoneFromSelection()}
                onClearSelection={() => handleSelectedPointIds([])}
                hasSelectedZone={!!selectedZoneId}
                hasSelectedPoints={selectedPointIds.length > 0}
                selectedPointCount={selectedPointIds.length}
              />
              <div className="text-xs font-mono text-muted-foreground">
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Zone Toolbar - in Export Studio */}
          {activeView === 'export' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar
                activeTool={drawingTool}
                onToolChange={setDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={() => handleCreateZoneFromSelection(exportSelectedPointIds)}
                onClearSelection={() => handleExportSelectedPointIds([])}
                hasSelectedZone={!!selectedZoneId}
                hasSelectedPoints={exportSelectedPointIds.length > 0}
                selectedPointCount={exportSelectedPointIds.length}
              />
              <div className="text-xs font-mono text-muted-foreground">
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Visualization Area */}
          <div className="flex-1 relative p-2">
            {activeView === 'analysis' ? (
              <div className="h-full border-2 border-border bg-card overflow-hidden">
                <AnalysisPanel
                  zones={zones}
                  points={data?.points || []}
                  selectedProperty={selectedProperty}
                  propertyNames={data?.propertyNames || []}
                  onPropertyChange={handlePropertyChange}
                />
              </div>
            ) : activeView === 'export' ? (
              <div className="flex h-full gap-4">
                {/* Export Canvas */}
                <div className="flex-1 h-full overflow-hidden">
                  <ExportCanvas
                    ref={exportCanvasRef}
                    points={data?.points || []}
                    selectedProperty={selectedProperty}
                    colorScheme={colorScheme}
                    minValue={currentMin}
                    maxValue={currentMax}
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    settings={exportSettings}
                    drawingTool={drawingTool}
                    selectedPointIds={exportSelectedPointIds}
                    
                    onZoneSelect={handleSelectZone}
                    onPointsSelected={handleExportSelectedPointIds}
                  />
                </div>
                
                {/* Export Studio Sidebar */}
                <div className="w-80 space-y-4 overflow-y-auto">
                  {/* Zone Panel */}
                  <div className="bg-card border-2 border-border rounded-lg">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider px-4 py-3 border-b border-border">
                      Zones
                    </h3>
                    <ZonePanel
                      zones={zones}
                      selectedZoneId={selectedZoneId}
                      points={data?.points || []}
                      selectedProperty={selectedProperty}
                      onSelectZone={handleSelectZone}
                      onUpdateZone={handleZoneUpdate}
                      onDeleteZone={handleZoneDelete}
                    />
                  </div>

                  {/* Zone Editor */}
                  {selectedZone && (
                    <ZoneEditor
                      zone={selectedZone}
                      onUpdate={handleZoneUpdate}
                    />
                  )}

                  {/* Export Options */}
                  <div className="bg-card border-2 border-border rounded-lg p-4">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider mb-4">
                      Export Options
                    </h3>
                    <ExportOptionsPanel
                      settings={exportSettings}
                      onSettingsChange={setExportSettings}
                      onExport={handleExport}
                      isExporting={isExporting}
                      dataBounds={dataBounds}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div ref={visualizationRef} className="w-full h-full flex items-start justify-center">
                {activeView === '2d' ? (
                  <div className="w-full h-full max-h-[calc(100vh-200px)] border-2 border-border bg-card">
                    <Heatmap2D
                      points={data?.points || []}
                      selectedProperty={selectedProperty}
                      colorScheme={colorScheme}
                      minValue={currentMin}
                      maxValue={currentMax}
                      selectedPoint={selectedPoint}
                      highlightedPoints={highlightedOutliers}
                      selectedPointIds={selectedPointIds}
                      showContours={showContours}
                      showInterpolation={showInterpolation}
                      drawingTool={heatmapDrawingTool}
                      zones={zones}
                      selectedZoneId={selectedZoneId}
                      onPointSelect={setSelectedPoint}
                      onPointHover={setHoveredPoint}
                      onPointsSelected={handleSelectedPointIds}
                      onZoneSelect={handleSelectZone}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full border-2 border-border bg-card">
                    <Scene3D
                      points={data?.points || []}
                      selectedProperty={selectedProperty}
                      colorScheme={colorScheme}
                      minValue={currentMin}
                      maxValue={currentMax}
                      selectedPoint={selectedPoint}
                      onPointSelect={setSelectedPoint}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Point Tooltip */}
      {hoveredPoint && !selectedPoint && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <PointDetails
            point={hoveredPoint}
            onClose={() => setHoveredPoint(null)}
          />
        </div>
      )}

      {/* Selected Point Details */}
      {selectedPoint && !editingPoint && (
        <div className="fixed bottom-20 right-8 z-50">
          <PointDetails
            point={selectedPoint}
            onClose={() => setSelectedPoint(null)}
          />
        </div>
      )}

      {/* Point Editor Modal */}
      {editingPoint && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <PointEditor
            point={editingPoint}
            isNewPoint={isAddingPoint}
            onSave={handleSavePoint}
            onDelete={(pointId) => handleDeletePoint(pointId)}
            onClose={() => {
              setEditingPoint(null);
              setIsAddingPoint(false);
            }}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>
            {data ? `Viewing: ${selectedProperty} | Range: ${currentMin.toFixed(2)} - ${currentMax.toFixed(2)}` : 'Load data to begin'}
          </span>
          <span>Nanoindentation Data Visualization</span>
        </div>
      </footer>
    </div>
  );
};
