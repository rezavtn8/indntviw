import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heatmap2D } from '@/components/visualization/Heatmap2D';
import { Scene3D } from '@/components/visualization/Scene3D';
import { ColorLegend } from '@/components/visualization/ColorLegend';
import { PropertySelector } from '@/components/controls/PropertySelector';
import { ColorSchemeSelector } from '@/components/controls/ColorSchemeSelector';
import { RangeControls } from '@/components/controls/RangeControls';
import { FileUploader } from '@/components/controls/FileUploader';
import { ExportControls } from '@/components/controls/ExportControls';
import { VisualizationOptions } from '@/components/controls/VisualizationOptions';
import { SelectionToolbar, SelectionMode } from '@/components/controls/SelectionToolbar';
import { PointDetails } from '@/components/panels/PointDetails';
import { PointEditor } from '@/components/panels/PointEditor';
import { OutlierDetector } from '@/components/panels/OutlierDetector';
import { SelectionStatisticsPanel } from '@/components/panels/SelectionStatisticsPanel';
import { DistributionHistogram } from '@/components/visualization/DistributionHistogram';
import { IndentationData, IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { parseTabSeparatedData } from '@/utils/dataParser';
import { Grid2X2, Box, Edit3, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IndentationPoint | null>(null);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [highlightedOutliers, setHighlightedOutliers] = useState<number[]>([]);
  
  // Visualization options
  const [showContours, setShowContours] = useState(true);
  const [showInterpolation, setShowInterpolation] = useState(false);
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
  
  // Ref for screenshot/export
  const visualizationRef = useRef<HTMLDivElement>(null);

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
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* View Tabs */}
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as '2d' | '3d')}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="2d" className="font-mono text-sm gap-2">
                  <Grid2X2 className="w-4 h-4" />
                  2D Heatmap
                </TabsTrigger>
                <TabsTrigger value="3d" className="font-mono text-sm gap-2">
                  <Box className="w-4 h-4" />
                  3D View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Selection Toolbar - only in 2D view */}
          {activeView === '2d' && data && (
            <div className="px-4 py-2 border-b border-border">
              <SelectionToolbar
                selectionMode={selectionMode}
                selectedCount={selectedPointIds.length}
                onModeChange={setSelectionMode}
                onClearSelection={() => setSelectedPointIds([])}
              />
            </div>
          )}

          {/* Visualization Area */}
          <div className="flex-1 relative p-4">
            <div ref={visualizationRef} className="w-full h-full">
              {activeView === '2d' ? (
                <div className="w-full h-full border-2 border-border bg-card">
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
                    selectionMode={selectionMode}
                    onPointSelect={setSelectedPoint}
                    onPointHover={setHoveredPoint}
                    onLassoSelect={handleLassoSelect}
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
