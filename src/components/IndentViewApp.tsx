import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { ZoneComparisonPanel } from '@/components/panels/ZoneComparisonPanel';
import { ZoneEditor } from '@/components/panels/ZoneEditor';
import { ExportOptionsPanel } from '@/components/panels/ExportOptionsPanel';
import { DistributionHistogram } from '@/components/visualization/DistributionHistogram';
import { IndentationData, IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { Zone, ExportSettings, DEFAULT_EXPORT_SETTINGS } from '@/types/zones';
import { generateZoneId, updateZoneBoundary, createZoneFromSelection } from '@/utils/zoneUtils';
import { parseTabSeparatedData } from '@/utils/dataParser';
import { Grid2X2, Box, Edit3, Plus, Undo2, FileOutput } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export const IndentViewApp: React.FC = () => {
  const [data, setData] = useState<IndentationData | null>(null);
  const [originalData, setOriginalData] = useState<IndentationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('HIT');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('viridis');
  const [selectedPoint, setSelectedPoint] = useState<IndentationPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<IndentationPoint | null>(null);
  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'2d' | '3d' | 'export'>('2d');
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IndentationPoint | null>(null);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [highlightedOutliers, setHighlightedOutliers] = useState<number[]>([]);
  
  // Visualization options
  const [showContours, setShowContours] = useState(true);
  const [showInterpolation, setShowInterpolation] = useState(false);
  
  // Selection state (unified for 2D view and Export Studio)
  const [heatmapDrawingTool, setHeatmapDrawingTool] = useState<DrawingTool>('select');
  const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
  
  // Ref for screenshot/export
  const visualizationRef = useRef<HTMLDivElement>(null);
  const exportCanvasRef = useRef<ExportCanvasRef>(null);
  
  // Zone state (shared between 2D view and Export Studio)
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [comparedZoneIds, setComparedZoneIds] = useState<string[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSelectedPointIds, setExportSelectedPointIds] = useState<number[]>([]);

  // Load sample data on mount
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const response = await fetch('/sample-data/sample_indentation.txt');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseTabSeparatedData(text);
          setData(parsed);
          setOriginalData(parsed);
          toast.success(`Loaded sample data: ${parsed.points.length} points`);
        }
      } catch (error) {
        console.log('No sample data found, ready for file upload');
      }
    };
    loadSampleData();
  }, []);

  // Update selected property when data changes
  useEffect(() => {
    if (data && !data.propertyNames.includes(selectedProperty)) {
      const defaultProp = data.propertyNames.find(p => p === 'HIT') || data.propertyNames[0];
      if (defaultProp) setSelectedProperty(defaultProp);
    }
  }, [data, selectedProperty]);

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

  // Calculate spatial data bounds for axis settings
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

  // Calculate point radius in data units (for zone boundaries)
  const pointRadiusDataUnits = useMemo(() => {
    if (!data || data.points.length === 0) return 0.5;
    const xRange = dataBounds.xMax - dataBounds.xMin || 1;
    const yRange = dataBounds.yMax - dataBounds.yMin || 1;
    const avgDistance = Math.sqrt((xRange * yRange) / data.points.length);
    // This matches the visual point radius calculation
    return avgDistance * 0.35;
  }, [data, dataBounds]);

  const handlePropertyChange = useCallback((property: string) => {
    setSelectedProperty(property);
    setCustomMin(null);
    setCustomMax(null);
  }, []);

  const handleResetRange = useCallback(() => {
    setCustomMin(null);
    setCustomMax(null);
  }, []);

  const handleDataLoaded = useCallback((newData: IndentationData) => {
    setData(newData);
    setOriginalData(newData);
    setSelectedPoint(null);
    setCustomMin(null);
    setCustomMax(null);
    setHighlightedOutliers([]);
    setSelectedPointIds([]);
  }, []);

  // Handle lasso selection
  const handleLassoSelect = useCallback((pointIds: number[]) => {
    setSelectedPointIds(pointIds);
    if (pointIds.length > 0) {
      toast.success(`Selected ${pointIds.length} points`);
    }
  }, []);

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

    setData(newData);
    setSelectedPoint(updatedPoint);
    setEditingPoint(null);
    setIsAddingPoint(false);
  }, [data, isAddingPoint, recalculateStatistics]);

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

    setData(newData);
    setSelectedPoint(null);
    setEditingPoint(null);
  }, [data, recalculateStatistics]);

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

    setData(newData);
    setHighlightedOutliers([]);
    setSelectedPoint(null);
  }, [data, recalculateStatistics]);

  const handleResetData = useCallback(() => {
    if (originalData) {
      setData(originalData);
      setSelectedPoint(null);
      setHighlightedOutliers([]);
      toast.success('Data reset to original');
    }
  }, [originalData]);

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  // Efficient change detection without JSON.stringify
  const hasChanges = useMemo(() => {
    if (!data || !originalData) return false;
    if (data.points.length !== originalData.points.length) return true;
    // Check if any point reference changed (works because we create new objects on edit)
    return data.points !== originalData.points;
  }, [data, originalData]);

  // Zone management handlers - works for both 2D view and Export Studio
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
    
    setZones(prev => [...prev, newZone]);
    setSelectedZoneId(newZone.id);
    
    // Clear selection in whichever view is active
    if (activeView === 'export') {
      setExportSelectedPointIds([]);
    } else {
      setSelectedPointIds([]);
    }
    
    toast.success(`Created ${newZone.name} with ${ids.length} points`);
  }, [data, exportSelectedPointIds, selectedPointIds, zones.length, pointRadiusDataUnits, activeView]);

  // Toggle zone comparison
  const handleToggleCompare = useCallback((zoneId: string) => {
    setComparedZoneIds(prev => {
      if (prev.includes(zoneId)) {
        return prev.filter(id => id !== zoneId);
      }
      // Maximum 2 zones for comparison
      if (prev.length >= 2) {
        return [prev[1], zoneId];
      }
      return [...prev, zoneId];
    });
  }, []);


  const handleZoneUpdate = useCallback((zone: Zone) => {
    if (!data) {
      setZones(prev => prev.map(z => z.id === zone.id ? zone : z));
      return;
    }
    // Regenerate boundary when boundary settings change
    const updatedZone = updateZoneBoundary(zone, data.points, pointRadiusDataUnits);
    setZones(prev => prev.map(z => z.id === zone.id ? updatedZone : z));
  }, [data, pointRadiusDataUnits]);

  const handleZoneDelete = useCallback((zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
    toast.success('Zone deleted');
  }, [selectedZoneId]);

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
        case 'escape': setExportSelectedPointIds([]); break;
        case 'delete':
        case 'backspace':
          if (selectedZoneId) handleZoneDelete(selectedZoneId);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, selectedZoneId, handleZoneDelete]);

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

      <div className="flex-1 flex">
        {/* Sidebar */}
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
                onColorSchemeChange={setColorScheme}
              />

              <RangeControls
                dataMin={dataMin}
                dataMax={dataMax}
                currentMin={currentMin}
                currentMax={currentMax}
                onMinChange={setCustomMin}
                onMaxChange={setCustomMax}
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
                  onHighlightOutliers={setHighlightedOutliers}
                />
              )}

              <SelectionStatisticsPanel
                allPoints={data.points}
                selectedPoints={selectedPoints}
                selectedProperty={selectedProperty}
                onExportSelected={selectedPoints.length > 0 ? handleExportSelected : undefined}
              />

              <DistributionHistogram
                allPoints={data.points}
                selectedPoints={selectedPoints}
                selectedProperty={selectedProperty}
              />

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
                    onSelectZone={setSelectedZoneId}
                    onUpdateZone={handleZoneUpdate}
                    onDeleteZone={handleZoneDelete}
                  />
                </div>
              )}

              {/* Zone Comparison Panel for 2D View */}
              {activeView === '2d' && zones.length > 0 && (
                <div className="bg-card border-2 border-border rounded-lg p-4">
                  <h3 className="font-mono text-sm font-semibold uppercase tracking-wider mb-4">
                    Zone Comparison
                  </h3>
                  <ZoneComparisonPanel
                    zones={zones}
                    points={data.points}
                    selectedProperty={selectedProperty}
                    comparedZoneIds={comparedZoneIds}
                    onToggleCompare={handleToggleCompare}
                  />
                </div>
              )}
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* View Tabs */}
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as '2d' | '3d' | 'export')}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="2d" className="font-mono text-sm gap-2">
                  <Grid2X2 className="w-4 h-4" />
                  2D Heatmap
                </TabsTrigger>
                <TabsTrigger value="3d" className="font-mono text-sm gap-2">
                  <Box className="w-4 h-4" />
                  3D View
                </TabsTrigger>
                <TabsTrigger value="export" className="font-mono text-sm gap-2">
                  <FileOutput className="w-4 h-4" />
                  Export Studio
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Zone Toolbar - in 2D view (same as Export Studio) */}
          {activeView === '2d' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar
                activeTool={heatmapDrawingTool}
                onToolChange={setHeatmapDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={() => handleCreateZoneFromSelection()}
                onClearSelection={() => setSelectedPointIds([])}
                hasSelectedZone={!!selectedZoneId}
                hasSelectedPoints={selectedPointIds.length > 0}
                selectedPointCount={selectedPointIds.length}
              />
              <div className="text-xs font-mono text-muted-foreground">
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Zone Toolbar - only in Export Studio */}
          {activeView === 'export' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar
                activeTool={drawingTool}
                onToolChange={setDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={handleCreateZoneFromSelection}
                onClearSelection={() => setExportSelectedPointIds([])}
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
            {activeView === 'export' ? (
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
                    
                    onZoneSelect={setSelectedZoneId}
                    onPointsSelected={setExportSelectedPointIds}
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
                      onSelectZone={setSelectedZoneId}
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
                      onPointsSelected={setSelectedPointIds}
                      onZoneSelect={setSelectedZoneId}
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
