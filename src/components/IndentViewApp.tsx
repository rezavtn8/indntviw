import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heatmap2D } from '@/components/visualization/Heatmap2D';
import { Scene3D } from '@/components/visualization/Scene3D';
import { ExportCanvas } from '@/components/visualization/ExportCanvas';
import { ColorLegend } from '@/components/visualization/ColorLegend';
import { PropertySelector } from '@/components/controls/PropertySelector';
import { ColorSchemeSelector } from '@/components/controls/ColorSchemeSelector';
import { RangeControls } from '@/components/controls/RangeControls';
import { FileUploader } from '@/components/controls/FileUploader';
import { ExportControls } from '@/components/controls/ExportControls';
import { VisualizationOptions } from '@/components/controls/VisualizationOptions';
import { View3DControls } from '@/components/controls/View3DControls';
import { ZoneToolbar } from '@/components/controls/ZoneToolbar';
import { PointDetails } from '@/components/panels/PointDetails';
import { PointEditor } from '@/components/panels/PointEditor';
import { OutlierDetector } from '@/components/panels/OutlierDetector';
import { SelectionStatisticsPanel } from '@/components/panels/SelectionStatisticsPanel';
import { ZonePanel } from '@/components/panels/ZonePanel';
import { ZoneEditor } from '@/components/panels/ZoneEditor';
import { ExportOptionsPanel } from '@/components/panels/ExportOptionsPanel';
import { AnalysisPanel } from '@/components/panels/AnalysisPanel';
import { Spatial3DPanel } from '@/components/analysis/Spatial3DPanel';
import { FileTabs } from '@/components/FileTabs';
import { useSession, useVisualization, useZones, useEditor } from '@/contexts';
import { usePageDropZone } from '@/hooks/usePageDropZone';
import { Grid2X2, Box, Edit3, Plus, Undo2, FileOutput, BarChart3, Upload } from 'lucide-react';

export const IndentViewApp: React.FC = () => {
  const [activeView, setActiveView] = useState<'2d' | '3d' | 'analysis' | 'export'>('2d');
  const visualizationRef = useRef<HTMLDivElement>(null);

  // Context hooks
  const {
    fileSessions, activeSessionId, data, selectedProperty, colorScheme,
    selectedPointIds, highlightedOutliers, exportSelectedPointIds,
    isLoading, setIsLoading,
    handleDataLoaded, handleSelectSession, handleCloseSession, updateActiveSession,
  } = useSession();

  const {
    showContours, setShowContours, showInterpolation, setShowInterpolation,
    showSurfaceMesh, setShowSurfaceMesh, surfaceOpacity, setSurfaceOpacity,
    showWireframe, setShowWireframe, showPointsWithSurface, setShowPointsWithSurface,
    surfaceType, setSurfaceType, flipX, setFlipX, flipY, setFlipY, flipZ, setFlipZ,
    heatmapDrawingTool, setHeatmapDrawingTool, drawingTool, setDrawingTool,
    exportSettings, setExportSettings, isExporting, exportCanvasRef, handleExport,
    dataMin, dataMax, currentMin, currentMax, dataBounds,
    handlePropertyChange, handleColorSchemeChange, handleResetRange, getPropertyUnit,
  } = useVisualization();

  const {
    zones, selectedZoneId, selectedZone,
    handleCreateZoneFromSelection, handleZoneUpdate, handleZoneDelete, handleSelectZone,
  } = useZones();

  const {
    isEditing, setIsEditing, editingPoint, setEditingPoint, isAddingPoint, setIsAddingPoint,
    selectedPoint, setSelectedPoint, hoveredPoint, setHoveredPoint,
    selectedPoints, hasChanges,
    handleSavePoint, handleDeletePoint, handleAddNewPoint,
    handleRemoveOutliers, handleResetData, handleExportSelected,
    handleSelectedPointIds, handleExportSelectedPointIds, handleHighlightOutliers,
  } = useEditor();

  // Page-level drag and drop
  const { isDraggingOverPage } = usePageDropZone({
    onDataLoaded: handleDataLoaded,
    isLoading,
    setIsLoading,
  });

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
  }, [activeView, selectedZoneId, handleZoneDelete, handleExportSelectedPointIds, setDrawingTool]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Page-level drop overlay */}
      {isDraggingOverPage && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary rounded-lg bg-card/50">
            <Upload className="w-12 h-12 text-primary animate-bounce" />
            <span className="font-mono text-lg font-bold text-primary">Drop files to upload</span>
            <span className="font-mono text-xs text-muted-foreground">.txt, .csv, .tsv, .xlsx, .xls</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">IndentView</h1>
            <span className="border border-border px-2 py-1 font-mono text-xs uppercase text-muted-foreground">v1.0</span>
          </div>
          
          <div className="flex items-center gap-3">
            {data && (
              <>
                <span className="font-mono text-sm text-muted-foreground">{data.points.length} points</span>
                {hasChanges && (
                  <Button variant="outline" size="sm" onClick={handleResetData} className="gap-1">
                    <Undo2 className="w-4 h-4" />Reset
                  </Button>
                )}
                <Button variant={isEditing ? 'default' : 'outline'} size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-1">
                  <Edit3 className="w-4 h-4" />{isEditing ? 'Done Editing' : 'Edit Mode'}
                </Button>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddNewPoint} className="gap-1">
                    <Plus className="w-4 h-4" />Add Point
                  </Button>
                )}
                <ExportControls data={data} visualizationRef={visualizationRef} selectedProperty={selectedProperty} />
              </>
            )}
          </div>
        </div>
      </header>

      {/* File Tabs */}
      <FileTabs sessions={fileSessions} activeSessionId={activeSessionId} onSelectSession={handleSelectSession} onCloseSession={handleCloseSession} />

      <div className="flex-1 flex">
        {/* Sidebar */}
        {activeView !== 'analysis' && (
          <aside className="w-80 border-r-2 border-border bg-card p-4 space-y-6 overflow-y-auto">
            <FileUploader onDataLoaded={handleDataLoaded} isLoading={isLoading} setIsLoading={setIsLoading} />
            {data && (
              <>
                <PropertySelector availableProperties={data.propertyNames} selectedProperty={selectedProperty} onPropertyChange={handlePropertyChange} />
                <ColorSchemeSelector colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />
                <RangeControls dataMin={dataMin} dataMax={dataMax} currentMin={currentMin} currentMax={currentMax}
                  onMinChange={(val) => updateActiveSession({ customMin: val })}
                  onMaxChange={(val) => updateActiveSession({ customMax: val })}
                  onReset={handleResetRange} />
                {activeView === '2d' && (
                  <VisualizationOptions showContours={showContours} showInterpolation={showInterpolation}
                    onShowContoursChange={setShowContours} onShowInterpolationChange={setShowInterpolation} />
                )}
                {activeView === '3d' && (
                  <View3DControls showSurfaceMesh={showSurfaceMesh} surfaceOpacity={surfaceOpacity} showWireframe={showWireframe}
                    showPoints={showPointsWithSurface} surfaceType={surfaceType} flipX={flipX} flipY={flipY} flipZ={flipZ}
                    onShowSurfaceMeshChange={setShowSurfaceMesh} onSurfaceOpacityChange={setSurfaceOpacity}
                    onShowWireframeChange={setShowWireframe} onShowPointsChange={setShowPointsWithSurface}
                    onSurfaceTypeChange={setSurfaceType} onFlipXChange={setFlipX} onFlipYChange={setFlipY} onFlipZChange={setFlipZ} />
                )}
                <ColorLegend selectedProperty={selectedProperty} unit={getPropertyUnit(selectedProperty)} colorScheme={colorScheme} minValue={currentMin} maxValue={currentMax} />
                {isEditing && (
                  <OutlierDetector points={data.points} selectedProperty={selectedProperty} onRemoveOutliers={handleRemoveOutliers} onHighlightOutliers={handleHighlightOutliers} />
                )}
                {(activeView === '2d' || activeView === '3d') && (
                  <SelectionStatisticsPanel allPoints={data.points} selectedPoints={selectedPoints} selectedProperty={selectedProperty}
                    onExportSelected={selectedPoints.length > 0 ? handleExportSelected : undefined} defaultOpen={false} />
                )}
                {activeView === '2d' && zones.length > 0 && (
                  <div className="bg-card border-2 border-border rounded-lg">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider px-4 py-3 border-b border-border">Zones ({zones.length})</h3>
                    <ZonePanel zones={zones} selectedZoneId={selectedZoneId} points={data.points} selectedProperty={selectedProperty}
                      onSelectZone={handleSelectZone} onUpdateZone={handleZoneUpdate} onDeleteZone={handleZoneDelete} />
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
                <TabsTrigger value="2d" className="font-mono text-sm gap-2"><Grid2X2 className="w-4 h-4" />2D Heatmap</TabsTrigger>
                <TabsTrigger value="3d" className="font-mono text-sm gap-2"><Box className="w-4 h-4" />3D View</TabsTrigger>
                <TabsTrigger value="analysis" className="font-mono text-sm gap-2"><BarChart3 className="w-4 h-4" />Analysis</TabsTrigger>
                <TabsTrigger value="export" className="font-mono text-sm gap-2"><FileOutput className="w-4 h-4" />Export Studio</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Zone Toolbar */}
          {activeView === '2d' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar activeTool={heatmapDrawingTool} onToolChange={setHeatmapDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={() => handleCreateZoneFromSelection()}
                onClearSelection={() => handleSelectedPointIds([])}
                hasSelectedZone={!!selectedZoneId} hasSelectedPoints={selectedPointIds.length > 0} selectedPointCount={selectedPointIds.length} />
              <div className="text-xs font-mono text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''}</div>
            </div>
          )}
          {activeView === 'export' && data && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-4">
              <ZoneToolbar activeTool={drawingTool} onToolChange={setDrawingTool}
                onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
                onCreateZone={() => handleCreateZoneFromSelection(exportSelectedPointIds)}
                onClearSelection={() => handleExportSelectedPointIds([])}
                hasSelectedZone={!!selectedZoneId} hasSelectedPoints={exportSelectedPointIds.length > 0} selectedPointCount={exportSelectedPointIds.length} />
              <div className="text-xs font-mono text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''}</div>
            </div>
          )}

          {/* Visualization Area */}
          <div className="flex-1 relative p-2">
            {activeView === 'analysis' ? (
              <div className="h-full border-2 border-border bg-card overflow-hidden">
                <AnalysisPanel zones={zones} points={data?.points || []} selectedProperty={selectedProperty}
                  propertyNames={data?.propertyNames || []} onPropertyChange={handlePropertyChange} fileSessions={fileSessions} />
              </div>
            ) : activeView === 'export' ? (
              <div className="flex h-full gap-4">
                <div className="flex-1 h-full overflow-hidden">
                  <ExportCanvas ref={exportCanvasRef} points={data?.points || []} selectedProperty={selectedProperty}
                    colorScheme={colorScheme} minValue={currentMin} maxValue={currentMax} zones={zones} selectedZoneId={selectedZoneId}
                    settings={exportSettings} drawingTool={drawingTool} selectedPointIds={exportSelectedPointIds}
                    onZoneSelect={handleSelectZone} onPointsSelected={handleExportSelectedPointIds} />
                </div>
                <div className="w-80 space-y-4 overflow-y-auto">
                  <div className="bg-card border-2 border-border rounded-lg">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider px-4 py-3 border-b border-border">Zones</h3>
                    <ZonePanel zones={zones} selectedZoneId={selectedZoneId} points={data?.points || []} selectedProperty={selectedProperty}
                      onSelectZone={handleSelectZone} onUpdateZone={handleZoneUpdate} onDeleteZone={handleZoneDelete} />
                  </div>
                  {selectedZone && <ZoneEditor zone={selectedZone} onUpdate={handleZoneUpdate} />}
                  <div className="bg-card border-2 border-border rounded-lg p-4">
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wider mb-4">Export Options</h3>
                    <ExportOptionsPanel settings={exportSettings} onSettingsChange={setExportSettings}
                      onExport={handleExport} isExporting={isExporting} dataBounds={dataBounds} />
                  </div>
                </div>
              </div>
            ) : (
              <div ref={visualizationRef} className="w-full h-full flex items-start justify-center">
                {activeView === '2d' ? (
                  <div className="w-full h-full max-h-[calc(100vh-200px)] border-2 border-border bg-card">
                    <Heatmap2D points={data?.points || []} selectedProperty={selectedProperty} colorScheme={colorScheme}
                      minValue={currentMin} maxValue={currentMax} selectedPoint={selectedPoint} highlightedPoints={highlightedOutliers}
                      selectedPointIds={selectedPointIds} showContours={showContours} showInterpolation={showInterpolation}
                      drawingTool={heatmapDrawingTool} zones={zones} selectedZoneId={selectedZoneId}
                      onPointSelect={setSelectedPoint} onPointHover={setHoveredPoint} onPointsSelected={handleSelectedPointIds} onZoneSelect={handleSelectZone} />
                  </div>
                ) : (
                  <div className="w-full h-full flex gap-2">
                    <div className="flex-1 border-2 border-border bg-card">
                      <Scene3D points={data?.points || []} selectedProperty={selectedProperty} colorScheme={colorScheme}
                        minValue={currentMin} maxValue={currentMax} selectedPoint={selectedPoint} onPointSelect={setSelectedPoint}
                        showSurface={showSurfaceMesh} surfaceOpacity={surfaceOpacity} showWireframe={showWireframe}
                        showPoints={showPointsWithSurface || !showSurfaceMesh} surfaceType={surfaceType} flipX={flipX} flipY={flipY} flipZ={flipZ} />
                    </div>
                    <div className="w-72 border-2 border-border bg-card rounded-lg overflow-hidden">
                      <Spatial3DPanel points={data?.points || []} selectedProperty={selectedProperty} />
                    </div>
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
          <PointDetails point={hoveredPoint} onClose={() => setHoveredPoint(null)} />
        </div>
      )}

      {/* Selected Point Details */}
      {selectedPoint && !editingPoint && (
        <div className="fixed bottom-20 right-8 z-50">
          <PointDetails point={selectedPoint} onClose={() => setSelectedPoint(null)} />
        </div>
      )}

      {/* Point Editor Modal */}
      {editingPoint && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <PointEditor point={editingPoint} isNewPoint={isAddingPoint} onSave={handleSavePoint}
            onDelete={(pointId) => handleDeletePoint(pointId)}
            onClose={() => { setEditingPoint(null); setIsAddingPoint(false); }} />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>{data ? `Viewing: ${selectedProperty} | Range: ${currentMin.toFixed(2)} - ${currentMax.toFixed(2)}` : 'Load data to begin'}</span>
          <span>Nanoindentation Data Visualization</span>
        </div>
      </footer>
    </div>
  );
};
