import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { ExportSettings, DEFAULT_EXPORT_SETTINGS } from '@/types/zones';
import { DrawingTool } from '@/components/controls/ZoneToolbar';
import { ExportCanvasRef } from '@/components/visualization/ExportCanvas';
import { useSession } from './SessionContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface VisualizationContextValue {
  // 2D Options
  showContours: boolean;
  setShowContours: (show: boolean) => void;
  showInterpolation: boolean;
  setShowInterpolation: (show: boolean) => void;
  
  // 3D Options
  showSurfaceMesh: boolean;
  setShowSurfaceMesh: (show: boolean) => void;
  surfaceOpacity: number;
  setSurfaceOpacity: (opacity: number) => void;
  showWireframe: boolean;
  setShowWireframe: (show: boolean) => void;
  showPointsWithSurface: boolean;
  setShowPointsWithSurface: (show: boolean) => void;
  surfaceType: 'full' | 'boundary';
  setSurfaceType: (type: 'full' | 'boundary') => void;
  flipX: boolean;
  setFlipX: (flip: boolean) => void;
  flipY: boolean;
  setFlipY: (flip: boolean) => void;
  flipZ: boolean;
  setFlipZ: (flip: boolean) => void;
  
  // Drawing tools
  heatmapDrawingTool: DrawingTool;
  setHeatmapDrawingTool: (tool: DrawingTool) => void;
  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  
  // Export
  exportSettings: ExportSettings;
  setExportSettings: (settings: ExportSettings) => void;
  isExporting: boolean;
  exportCanvasRef: React.RefObject<ExportCanvasRef>;
  handleExport: () => Promise<void>;
  
  // Computed values
  dataMin: number;
  dataMax: number;
  currentMin: number;
  currentMax: number;
  dataBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  pointRadiusDataUnits: number;
  
  // Helpers
  handlePropertyChange: (property: string) => void;
  handleColorSchemeChange: (scheme: ColorScheme) => void;
  handleMinChange: (val: number) => void;
  handleMaxChange: (val: number) => void;
  handleResetRange: () => void;
  getPropertyUnit: (key: string) => string;
}

const VisualizationContext = createContext<VisualizationContextValue | null>(null);

export const VisualizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data,
    selectedProperty,
    customMin,
    customMax,
    overrideColorRange,
    setGlobalSelectedProperty,
    updateActiveSession,
    setGlobalColorScheme,
    setGlobalCustomMin,
    setGlobalCustomMax,
    resetGlobalRange,
  } = useSession();
  
  // 2D Options
  const [showContours, setShowContours] = useState(true);
  const [showInterpolation, setShowInterpolation] = useState(false);
  
  // 3D Options
  const [showSurfaceMesh, setShowSurfaceMesh] = useState(false);
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.8);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showPointsWithSurface, setShowPointsWithSurface] = useState(true);
  const [surfaceType, setSurfaceType] = useState<'full' | 'boundary'>('full');
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [flipZ, setFlipZ] = useState(false);
  
  // Drawing tools
  const [heatmapDrawingTool, setHeatmapDrawingTool] = useState<DrawingTool>('select');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  
  // Export
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const exportCanvasRef = useRef<ExportCanvasRef>(null);

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
    // Update global property (affects all tabs)
    setGlobalSelectedProperty(property);
    // Reset custom range for active session when property changes
    updateActiveSession({ 
      customMin: null, 
      customMax: null 
    });
  }, [setGlobalSelectedProperty, updateActiveSession]);

  const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
    updateActiveSession({ colorScheme: scheme });
  }, [updateActiveSession]);

  const handleResetRange = useCallback(() => {
    updateActiveSession({ customMin: null, customMax: null });
  }, [updateActiveSession]);

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

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

  const value: VisualizationContextValue = {
    showContours,
    setShowContours,
    showInterpolation,
    setShowInterpolation,
    showSurfaceMesh,
    setShowSurfaceMesh,
    surfaceOpacity,
    setSurfaceOpacity,
    showWireframe,
    setShowWireframe,
    showPointsWithSurface,
    setShowPointsWithSurface,
    surfaceType,
    setSurfaceType,
    flipX,
    setFlipX,
    flipY,
    setFlipY,
    flipZ,
    setFlipZ,
    heatmapDrawingTool,
    setHeatmapDrawingTool,
    drawingTool,
    setDrawingTool,
    exportSettings,
    setExportSettings,
    isExporting,
    exportCanvasRef,
    handleExport,
    dataMin,
    dataMax,
    currentMin,
    currentMax,
    dataBounds,
    pointRadiusDataUnits,
    handlePropertyChange,
    handleColorSchemeChange,
    handleResetRange,
    getPropertyUnit,
  };

  return (
    <VisualizationContext.Provider value={value}>
      {children}
    </VisualizationContext.Provider>
  );
};

export const useVisualization = (): VisualizationContextValue => {
  const context = useContext(VisualizationContext);
  if (!context) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
};
