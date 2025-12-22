import React, { useState, useRef, useEffect } from 'react';
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
import { AppLayout, ViewSidebar, ContextPanel, AppToolbar } from '@/components/layout';
import { useSession, useVisualization, useZones, useEditor } from '@/contexts';
import { usePageDropZone } from '@/hooks/usePageDropZone';
import { Edit3, Plus, Undo2 } from 'lucide-react';

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

  // Render sidebar controls based on active view
  const renderSidebarControls = () => {
    if (activeView === 'analysis') return null; // Analysis has its own controls
    
    return (
      <>
        <FileUploader onDataLoaded={handleDataLoaded} isLoading={isLoading} setIsLoading={setIsLoading} />
        {data && (
          <>
            <PropertySelector availableProperties={data.propertyNames} selectedProperty={selectedProperty} onPropertyChange={handlePropertyChange} />
            <ColorSchemeSelector colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />
            <RangeControls 
              dataMin={dataMin} dataMax={dataMax} currentMin={currentMin} currentMax={currentMax}
              onMinChange={(val) => updateActiveSession({ customMin: val })}
              onMaxChange={(val) => updateActiveSession({ customMax: val })}
              onReset={handleResetRange} 
            />
            
            {activeView === '2d' && (
              <VisualizationOptions 
                showContours={showContours} showInterpolation={showInterpolation}
                onShowContoursChange={setShowContours} onShowInterpolationChange={setShowInterpolation} 
              />
            )}
            
            {activeView === '3d' && (
              <View3DControls 
                showSurfaceMesh={showSurfaceMesh} surfaceOpacity={surfaceOpacity} showWireframe={showWireframe}
                showPoints={showPointsWithSurface} surfaceType={surfaceType} flipX={flipX} flipY={flipY} flipZ={flipZ}
                onShowSurfaceMeshChange={setShowSurfaceMesh} onSurfaceOpacityChange={setSurfaceOpacity}
                onShowWireframeChange={setShowWireframe} onShowPointsChange={setShowPointsWithSurface}
                onSurfaceTypeChange={setSurfaceType} onFlipXChange={setFlipX} onFlipYChange={setFlipY} onFlipZChange={setFlipZ} 
              />
            )}

            {activeView === 'export' && (
              <ExportOptionsPanel 
                settings={exportSettings} onSettingsChange={setExportSettings}
                onExport={handleExport} isExporting={isExporting} dataBounds={dataBounds} 
              />
            )}
            
            <ColorLegend selectedProperty={selectedProperty} unit={getPropertyUnit(selectedProperty)} colorScheme={colorScheme} minValue={currentMin} maxValue={currentMax} />
            
            {isEditing && (
              <OutlierDetector points={data.points} selectedProperty={selectedProperty} onRemoveOutliers={handleRemoveOutliers} onHighlightOutliers={handleHighlightOutliers} />
            )}
            
            {(activeView === '2d' || activeView === '3d') && (
              <SelectionStatisticsPanel 
                allPoints={data.points} selectedPoints={selectedPoints} selectedProperty={selectedProperty}
                onExportSelected={selectedPoints.length > 0 ? handleExportSelected : undefined} defaultOpen={false} 
              />
            )}
          </>
        )}
      </>
    );
  };

  // Render toolbar based on active view
  const renderToolbar = () => {
    if (!data) return null;
    
    if (activeView === '2d') {
      return (
        <AppToolbar>
          <ZoneToolbar 
            activeTool={heatmapDrawingTool} onToolChange={setHeatmapDrawingTool}
            onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
            onCreateZone={() => handleCreateZoneFromSelection()}
            onClearSelection={() => handleSelectedPointIds([])}
            hasSelectedZone={!!selectedZoneId} hasSelectedPoints={selectedPointIds.length > 0} selectedPointCount={selectedPointIds.length} 
          />
          <div className="text-xs font-mono text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''}</div>
        </AppToolbar>
      );
    }
    
    if (activeView === 'export') {
      return (
        <AppToolbar>
          <ZoneToolbar 
            activeTool={drawingTool} onToolChange={setDrawingTool}
            onDeleteSelected={() => selectedZoneId && handleZoneDelete(selectedZoneId)}
            onCreateZone={() => handleCreateZoneFromSelection(exportSelectedPointIds)}
            onClearSelection={() => handleExportSelectedPointIds([])}
            hasSelectedZone={!!selectedZoneId} hasSelectedPoints={exportSelectedPointIds.length > 0} selectedPointCount={exportSelectedPointIds.length} 
          />
          <div className="text-xs font-mono text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''}</div>
        </AppToolbar>
      );
    }
    
    return null;
  };

  // Render context panel based on active view
  const renderContextPanel = () => {
    if (activeView === '2d' && zones.length > 0) {
      return (
        <ContextPanel title={`Zones (${zones.length})`}>
          <ZonePanel 
            zones={zones} selectedZoneId={selectedZoneId} points={data?.points || []} selectedProperty={selectedProperty}
            onSelectZone={handleSelectZone} onUpdateZone={handleZoneUpdate} onDeleteZone={handleZoneDelete} 
          />
        </ContextPanel>
      );
    }
    
    if (activeView === '3d') {
      return (
        <ContextPanel title="Spatial Analysis">
          <Spatial3DPanel points={data?.points || []} selectedProperty={selectedProperty} />
        </ContextPanel>
      );
    }
    
    if (activeView === 'export') {
      return (
        <ContextPanel title="Zones">
          <ZonePanel 
            zones={zones} selectedZoneId={selectedZoneId} points={data?.points || []} selectedProperty={selectedProperty}
            onSelectZone={handleSelectZone} onUpdateZone={handleZoneUpdate} onDeleteZone={handleZoneDelete} 
          />
          {selectedZone && <ZoneEditor zone={selectedZone} onUpdate={handleZoneUpdate} />}
        </ContextPanel>
      );
    }
    
    return null;
  };

  // Render main content based on active view
  const renderContent = () => {
    if (activeView === 'analysis') {
      return (
        <div className="h-full border border-border bg-card overflow-hidden">
          <AnalysisPanel 
            zones={zones} points={data?.points || []} selectedProperty={selectedProperty}
            propertyNames={data?.propertyNames || []} onPropertyChange={handlePropertyChange} fileSessions={fileSessions} 
          />
        </div>
      );
    }
    
    if (activeView === 'export') {
      return (
        <div className="h-full overflow-hidden">
          <ExportCanvas 
            ref={exportCanvasRef} points={data?.points || []} selectedProperty={selectedProperty}
            colorScheme={colorScheme} minValue={currentMin} maxValue={currentMax} zones={zones} selectedZoneId={selectedZoneId}
            settings={exportSettings} drawingTool={drawingTool} selectedPointIds={exportSelectedPointIds}
            onZoneSelect={handleSelectZone} onPointsSelected={handleExportSelectedPointIds} 
          />
        </div>
      );
    }
    
    if (activeView === '3d') {
      return (
        <div ref={visualizationRef} className="w-full h-full border border-border bg-card">
          <Scene3D 
            points={data?.points || []} selectedProperty={selectedProperty} colorScheme={colorScheme}
            minValue={currentMin} maxValue={currentMax} selectedPoint={selectedPoint} onPointSelect={setSelectedPoint}
            showSurface={showSurfaceMesh} surfaceOpacity={surfaceOpacity} showWireframe={showWireframe}
            showPoints={showPointsWithSurface || !showSurfaceMesh} surfaceType={surfaceType} flipX={flipX} flipY={flipY} flipZ={flipZ} 
          />
        </div>
      );
    }
    
    // Default: 2D view
    return (
      <div ref={visualizationRef} className="w-full h-full max-h-[calc(100vh-180px)] border border-border bg-card">
        <Heatmap2D 
          points={data?.points || []} selectedProperty={selectedProperty} colorScheme={colorScheme}
          minValue={currentMin} maxValue={currentMax} selectedPoint={selectedPoint} highlightedPoints={highlightedOutliers}
          selectedPointIds={selectedPointIds} showContours={showContours} showInterpolation={showInterpolation}
          drawingTool={heatmapDrawingTool} zones={zones} selectedZoneId={selectedZoneId}
          onPointSelect={setSelectedPoint} onPointHover={setHoveredPoint} onPointsSelected={handleSelectedPointIds} onZoneSelect={handleSelectZone} 
        />
      </div>
    );
  };

  return (
    <AppLayout
      isDraggingOverPage={isDraggingOverPage}
      header={
        <div className="flex items-center justify-between px-6 py-4">
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
      }
      fileTabs={
        <FileTabs 
          sessions={fileSessions} activeSessionId={activeSessionId} 
          onSelectSession={handleSelectSession} onCloseSession={handleCloseSession} 
        />
      }
      sidebar={
        <ViewSidebar activeView={activeView} onViewChange={setActiveView}>
          {renderSidebarControls()}
        </ViewSidebar>
      }
      toolbar={renderToolbar()}
      contextPanel={renderContextPanel()}
      footer={
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-6 py-2">
          <span>{data ? `${data.points.length} points loaded` : 'No data loaded'}</span>
          <span>IndentView</span>
        </div>
      }
      modals={
        <>
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
              <PointEditor 
                point={editingPoint} isNewPoint={isAddingPoint} onSave={handleSavePoint}
                onDelete={(pointId) => handleDeletePoint(pointId)}
                onClose={() => { setEditingPoint(null); setIsAddingPoint(false); }} 
              />
            </div>
          )}
        </>
      }
    >
      {renderContent()}
    </AppLayout>
  );
};
