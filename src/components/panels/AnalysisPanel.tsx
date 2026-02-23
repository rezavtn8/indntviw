import React, { useMemo, useState } from 'react';
import { Zone } from '@/types/zones';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { FileSession } from '@/types/fileSession';
import { getPointsInZone } from '@/utils/zoneUtils';
import { calculateDescriptiveStats, getPropertyValues } from '@/utils/advancedStatistics';
import { DescriptiveStats } from '@/components/analysis/DescriptiveStats';
import { BoxViolinPlots } from '@/components/analysis/BoxViolinPlots';
import { StatisticalTests } from '@/components/analysis/StatisticalTests';
import { DistributionPlots } from '@/components/analysis/DistributionPlots';
import { CorrelationAnalysis } from '@/components/analysis/CorrelationAnalysis';
import { AnalysisExport } from '@/components/analysis/AnalysisExport';
import { CrossSamplePanel } from '@/components/analysis/CrossSamplePanel';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Layers, GitCompare, Download, FileStack } from 'lucide-react';

interface AnalysisPanelProps {
  zones: Zone[];
  points: IndentationPoint[];
  selectedProperty: string;
  propertyNames: string[];
  onPropertyChange: (property: string) => void;
  fileSessions: FileSession[];
  sampleName?: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  zones,
  points,
  selectedProperty,
  propertyNames,
  onPropertyChange,
  fileSessions,
  sampleName = 'Sample',
}) => {
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [includeAllData, setIncludeAllData] = useState(true);
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Prepare analysis data
  const analysisData = useMemo(() => {
    const result: { name: string; color: string; values: number[]; stats: ReturnType<typeof calculateDescriptiveStats> }[] = [];

    // Add "All Data" if enabled
    if (includeAllData) {
      const values = getPropertyValues(points, selectedProperty);
      result.push({
        name: 'All Data',
        color: 'hsl(var(--muted-foreground))',
        values,
        stats: calculateDescriptiveStats(values),
      });
    }

    // Add selected zones
    zones
      .filter(z => selectedZoneIds.includes(z.id))
      .forEach(zone => {
        const zonePoints = getPointsInZone(points, zone);
        const values = getPropertyValues(zonePoints, selectedProperty);
        result.push({
          name: zone.name,
          color: zone.color,
          values,
          stats: calculateDescriptiveStats(values),
        });
      });

    return result;
  }, [points, zones, selectedZoneIds, selectedProperty, includeAllData]);

  const toggleZone = (zoneId: string) => {
    setSelectedZoneIds(prev =>
      prev.includes(zoneId)
        ? prev.filter(id => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  const selectAllZones = () => {
    setSelectedZoneIds(zones.map(z => z.id));
  };

  const clearZones = () => {
    setSelectedZoneIds([]);
  };

  const [analysisMode, setAnalysisMode] = useState<'single' | 'cross'>('single');

  // Show cross-sample tab only if multiple files
  const showCrossSample = fileSessions.length > 1;

  return (
    <div className="h-full flex flex-col">
      {/* Mode Tabs */}
      <div className="border-b-2 border-border bg-card px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => setAnalysisMode('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-colors ${
              analysisMode === 'single'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Single Sample
          </button>
          {showCrossSample && (
            <button
              onClick={() => setAnalysisMode('cross')}
              className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-colors ${
                analysisMode === 'cross'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <FileStack className="w-4 h-4" />
              Cross-Sample
            </button>
          )}
        </div>
      </div>

      {/* Cross-Sample Analysis */}
      {analysisMode === 'cross' && showCrossSample ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CrossSamplePanel
            fileSessions={fileSessions}
            selectedProperty={selectedProperty}
            propertyNames={propertyNames}
            onPropertyChange={onPropertyChange}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
      {/* Left Sidebar - Zone Selection */}
      <div className="w-64 border-r-2 border-border bg-card p-4 flex flex-col">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
          Analysis Controls
        </h3>

        {/* Property Selector */}
        <div className="mb-4">
          <Label className="font-mono text-xs uppercase text-muted-foreground mb-2 block">
            Property
          </Label>
          <Select value={selectedProperty} onValueChange={onPropertyChange}>
            <SelectTrigger className="font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {propertyNames.map(prop => (
                <SelectItem key={prop} value={prop} className="font-mono text-sm">
                  {getPropertyLabel(prop)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* All Data Toggle */}
        <div className="flex items-center justify-between mb-4 p-2 bg-muted/30 rounded">
          <Label className="font-mono text-sm cursor-pointer">All Data</Label>
          <Switch checked={includeAllData} onCheckedChange={setIncludeAllData} />
        </div>

        {/* Zone Selection */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <Label className="font-mono text-xs uppercase text-muted-foreground">
              Zones ({zones.length})
            </Label>
            <div className="flex gap-2">
              <button onClick={selectAllZones} className="text-xs text-primary hover:underline font-mono">
                All
              </button>
              <button onClick={clearZones} className="text-xs text-muted-foreground hover:underline font-mono">
                Clear
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              {zones.length === 0 ? (
                <div className="p-3 bg-muted/30 rounded border border-dashed border-border">
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    No zones created yet.
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-mono">
                    Switch to <span className="text-primary font-semibold">2D Heatmap</span> view and use the lasso or box tool to select points, then click "Create Zone".
                  </p>
                </div>
              ) : (
                zones.map(zone => (
                  <label
                    key={zone.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      selectedZoneIds.includes(zone.id) ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedZoneIds.includes(zone.id)}
                      onCheckedChange={() => toggleZone(zone.id)}
                    />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="font-mono text-sm flex-1 truncate">{zone.name}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Plot Options */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <Label className="font-mono text-xs uppercase text-muted-foreground block">
            Plot Options
          </Label>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs cursor-pointer">Show Violin</Label>
            <Switch checked={showViolin} onCheckedChange={setShowViolin} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs cursor-pointer">Show Points</Label>
            <Switch checked={showJitter} onCheckedChange={setShowJitter} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs cursor-pointer">B&W Mode</Label>
            <Switch checked={blackAndWhite} onCheckedChange={setBlackAndWhite} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs cursor-pointer">Scatter Density</Label>
            <Switch checked={showScatterDensity} onCheckedChange={setShowScatterDensity} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs cursor-pointer">Small Dots</Label>
            <Switch checked={showSmallDots} onCheckedChange={setShowSmallDots} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="descriptive" className="h-full flex flex-col">
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <TabsList className="bg-secondary">
              <TabsTrigger value="descriptive" className="font-mono text-sm gap-2">
                <BarChart3 className="w-4 h-4" />
                Descriptive
              </TabsTrigger>
              <TabsTrigger value="distribution" className="font-mono text-sm gap-2">
                <Layers className="w-4 h-4" />
                Distribution
              </TabsTrigger>
              <TabsTrigger value="comparison" className="font-mono text-sm gap-2">
                <GitCompare className="w-4 h-4" />
                Comparison
              </TabsTrigger>
              <TabsTrigger value="correlation" className="font-mono text-sm gap-2">
                <TrendingUp className="w-4 h-4" />
                Correlation
              </TabsTrigger>
              <TabsTrigger value="export" className="font-mono text-sm gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {analysisData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground font-mono text-sm mb-1">
                      No data selected for analysis
                    </p>
                    <p className="text-muted-foreground/70 font-mono text-xs">
                      Enable "All Data" or select zones from the sidebar to begin.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="descriptive" className="mt-0 space-y-4">
                    <DescriptiveStats stats={analysisData} selectedProperty={selectedProperty} />
                    <BoxViolinPlots
                      data={analysisData}
                      selectedProperty={selectedProperty}
                      showViolin={showViolin}
                      showJitter={showJitter}
                      blackAndWhite={blackAndWhite}
                      blendOverlap={showScatterDensity}
                      smallDots={showSmallDots}
                      xAxisLabel={sampleName}
                    />
                  </TabsContent>

                  <TabsContent value="distribution" className="mt-0 space-y-4">
                    <DistributionPlots data={analysisData} selectedProperty={selectedProperty} />
                  </TabsContent>

                  <TabsContent value="comparison" className="mt-0 space-y-4">
                    <StatisticalTests data={analysisData} selectedProperty={selectedProperty} />
                  </TabsContent>

                  <TabsContent value="correlation" className="mt-0 space-y-4">
                    <CorrelationAnalysis points={points} properties={propertyNames} />
                  </TabsContent>

                  <TabsContent value="export" className="mt-0 space-y-4">
                    <AnalysisExport 
                      data={analysisData} 
                      selectedProperty={selectedProperty}
                      points={points}
                      propertyNames={propertyNames}
                      showViolin={showViolin}
                      showJitter={showJitter}
                    />
                    <DescriptiveStats stats={analysisData} selectedProperty={selectedProperty} />
                  </TabsContent>
                </>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
        </div>
      )}
    </div>
  );
};
