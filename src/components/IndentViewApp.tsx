import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heatmap2D } from '@/components/visualization/Heatmap2D';
import { Scene3D } from '@/components/visualization/Scene3D';
import { ColorLegend } from '@/components/visualization/ColorLegend';
import { PropertySelector } from '@/components/controls/PropertySelector';
import { ColorSchemeSelector } from '@/components/controls/ColorSchemeSelector';
import { RangeControls } from '@/components/controls/RangeControls';
import { FileUploader } from '@/components/controls/FileUploader';
import { PointDetails } from '@/components/panels/PointDetails';
import { StatisticsPanel } from '@/components/panels/StatisticsPanel';
import { IndentationData, IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { parseTabSeparatedData } from '@/utils/dataParser';
import { Grid2X2, Box, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

export const IndentViewApp: React.FC = () => {
  const [data, setData] = useState<IndentationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('HIT');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('viridis');
  const [selectedPoint, setSelectedPoint] = useState<IndentationPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<IndentationPoint | null>(null);
  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');

  // Load sample data on mount
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const response = await fetch('/sample-data/sample_indentation.txt');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseTabSeparatedData(text);
          setData(parsed);
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
    setSelectedPoint(null);
    setCustomMin(null);
    setCustomMax(null);
  }, []);

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

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
          
          {data && (
            <div className="flex items-center gap-4 font-mono text-sm">
              <span className="text-muted-foreground">
                {data.points.length} points loaded
              </span>
            </div>
          )}
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

              <ColorLegend
                selectedProperty={selectedProperty}
                unit={getPropertyUnit(selectedProperty)}
                colorScheme={colorScheme}
                minValue={currentMin}
                maxValue={currentMax}
              />

              <StatisticsPanel
                data={data}
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

          {/* Visualization Area */}
          <div className="flex-1 relative p-4">
            {activeView === '2d' ? (
              <div className="w-full h-full border-2 border-border bg-card">
                <Heatmap2D
                  points={data?.points || []}
                  selectedProperty={selectedProperty}
                  colorScheme={colorScheme}
                  minValue={currentMin}
                  maxValue={currentMax}
                  selectedPoint={selectedPoint}
                  onPointSelect={setSelectedPoint}
                  onPointHover={setHoveredPoint}
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

            {/* Hovered Point Tooltip */}
            {hoveredPoint && !selectedPoint && activeView === '2d' && (
              <div className="absolute top-6 right-6 bg-card border-2 border-border p-3 shadow-md font-mono text-xs max-w-xs">
                <div className="font-bold mb-1">Point #{hoveredPoint.id + 1}</div>
                <div className="text-muted-foreground">
                  X: {hoveredPoint.x.toFixed(3)} mm | Y: {hoveredPoint.y.toFixed(3)} mm
                </div>
                <div className="mt-1 font-bold">
                  {selectedProperty}: {hoveredPoint.properties[selectedProperty]?.toFixed(4) ?? 'N/A'}
                  {getPropertyUnit(selectedProperty) && ` ${getPropertyUnit(selectedProperty)}`}
                </div>
              </div>
            )}

            {/* Selected Point Details */}
            {selectedPoint && (
              <div className="absolute top-6 right-6 w-72">
                <PointDetails
                  point={selectedPoint}
                  onClose={() => setSelectedPoint(null)}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t-2 border-border bg-card px-4 py-2">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Click points to select • Drag to pan • Scroll to zoom (3D)</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3" />
                <span>Nanoindentation Data Visualization</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
