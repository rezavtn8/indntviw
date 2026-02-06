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
import { ComprehensiveBatchExport } from '@/components/analysis/ComprehensiveBatchExport';
import { FileTabs } from '@/components/FileTabs';
import { AppLayout, ViewSidebar, ContextPanel, AppToolbar } from '@/components/layout';
import { useSession, useVisualization, useZones, useEditor } from '@/contexts';
import { usePageDropZone } from '@/hooks/usePageDropZone';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Edit3, Plus, Undo2, Redo2, ChevronDown, Image, Package, Trash2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const IndentViewApp: React.FC = () => {
  const [activeView, setActiveView] = useState<'2d' | '3d' | 'analysis' | 'export'>('2d');
  const [exportMode, setExportMode] = useState<'figure' | 'batch'>('figure');
  const visualizationRef = useRef<HTMLDivElement>(null);

  // Context hooks
  const {
    fileSessions, activeSessionId, data, selectedProperty, colorScheme,
    selectedPointIds, highlightedOutliers, exportSelectedPointIds,
    isLoading, setIsLoading, clearWorkspace,
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
    selectedPoints, hasChanges, canUndo, canRedo, handleUndo, handleRedo,
    handleSavePoint, handleDeletePoint, handleQuickDelete, handleBulkDelete, handleAddNewPoint,
    handleRemoveOutliers, handleResetData, handleExportSelected,
    handleSelectedPointIds, handleExportSelectedPointIds, handleHighlightOutliers,
  } = useEditor();

  // Page-level drag and drop
  const { isDraggingOverPage } = usePageDropZone({
    onDataLoaded: handleDataLoaded,
    isLoading,
    setIsLoading,
  });

  // Global keyboard shortcuts (undo/redo, delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Delete selected points in edit mode
      if (isEditing && (e.key === 'Delete' || e.key === 'Backspace') && selectedPointIds.length > 0) {
        e.preventDefault();
        handleBulkDelete(selectedPointIds);
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isEditing, selectedPointIds, handleBulkDelete]);

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
    if (activeView === 'analysis') return null;
    
    // For export view with batch mode, show minimal controls
    if (activeView === 'export' && exportMode === 'batch') {
      return null; // Batch export has its own full-screen interface
    }
    
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

            {activeView === 'export' && exportMode === 'figure' && (
              <ExportOptionsPanel 
                settings={exportSettings} onSettingsChange={setExportSettings}
                onExport={handleExport} isExporting={isExporting} dataBounds={dataBounds} 
              />
            )}
            
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-mono text-xs uppercase font-medium">Color Scale</span>
                <ChevronDown className="w-4 h-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <ColorLegend selectedProperty={selectedProperty} unit={getPropertyUnit(selectedProperty)} colorScheme={colorScheme} minValue={currentMin} maxValue={currentMax} />
              </CollapsibleContent>
            </Collapsible>
            
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
    
    if (activeView === 'export' && exportMode === 'figure') {
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

  // Render export mode tabs
  const renderExportModeTabs = () => {
    if (activeView !== 'export') return null;
    
    return (
      <div className="border-b-2 border-border bg-card px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => setExportMode('figure')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-colors ${
              exportMode === 'figure'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Image className="w-4 h-4" />
            Figure Export
          </button>
          <button
            onClick={() => setExportMode('batch')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-colors ${
              exportMode === 'batch'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Package className="w-4 h-4" />
            Batch Export
          </button>
        </div>
      </div>
    );
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
    
    if (activeView === 'export' && exportMode === 'figure') {
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
            sampleName={(fileSessions.find(s => s.id === activeSessionId)?.fileName || 'Sample').replace(/\.[^.]+$/, '')}
          />
        </div>
      );
    }
    
    if (activeView === 'export') {
      if (exportMode === 'batch') {
        return (
          <div className="h-full border border-border bg-card overflow-hidden">
            <ComprehensiveBatchExport
              fileSessions={fileSessions}
              selectedProperty={selectedProperty}
              propertyNames={data?.propertyNames || []}
              onPropertyChange={handlePropertyChange}
              groups={[]}
            />
          </div>
        );
      }
      
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
      <div ref={visualizationRef} className="w-full h-full max-h-[calc(100vh-180px)] border border-border bg-card relative">
        {isEditing && (
          <div className="absolute top-2 left-2 z-20 bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded font-mono text-xs uppercase tracking-wide">
            Edit Mode — Click point to delete
          </div>
        )}
        <Heatmap2D 
          points={data?.points || []} selectedProperty={selectedProperty} colorScheme={colorScheme}
          minValue={currentMin} maxValue={currentMax} selectedPoint={selectedPoint} highlightedPoints={highlightedOutliers}
          selectedPointIds={selectedPointIds} showContours={showContours} showInterpolation={showInterpolation}
          drawingTool={heatmapDrawingTool} zones={zones} selectedZoneId={selectedZoneId}
          isEditing={isEditing} onQuickDelete={handleQuickDelete}
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
            {fileSessions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1">
                    <RotateCcw className="w-4 h-4" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all open files, zones, and treatment groups. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearWorkspace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
                  <>
                    <div className="flex items-center gap-1 border-l border-border pl-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUndo} 
                        disabled={!canUndo}
                        className="gap-1"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRedo} 
                        disabled={!canRedo}
                        className="gap-1"
                        title="Redo (Ctrl+Shift+Z)"
                      >
                        <Redo2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddNewPoint} className="gap-1">
                      <Plus className="w-4 h-4" />Add Point
                    </Button>
                    {selectedPointIds.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleBulkDelete(selectedPointIds)} 
                        className="gap-1"
                      >
                        <Trash2 className="w-4 h-4" />Delete {selectedPointIds.length}
                      </Button>
                    )}
                  </>
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
      modeTabs={renderExportModeTabs()}
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
