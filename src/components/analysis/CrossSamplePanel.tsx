import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { calculateDescriptiveStats, getPropertyValues } from '@/utils/advancedStatistics';
import { SampleSelector, getSampleColor } from './SampleSelector';
import { CrossSampleStats } from './CrossSampleStats';
import { CrossSamplePlots } from './CrossSamplePlots';
import { CrossSampleTests } from './CrossSampleTests';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, GitCompare, Layers } from 'lucide-react';

interface CrossSamplePanelProps {
  fileSessions: FileSession[];
  selectedProperty: string;
  propertyNames: string[];
  onPropertyChange: (property: string) => void;
}

export const CrossSamplePanel: React.FC<CrossSamplePanelProps> = ({
  fileSessions,
  selectedProperty,
  propertyNames,
  onPropertyChange,
}) => {
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Prepare sample data for analysis
  const sampleData = useMemo(() => {
    return fileSessions
      .filter(session => selectedSessionIds.includes(session.id))
      .map((session, idx) => {
        // Find original index for consistent coloring
        const colorIndex = fileSessions.findIndex(s => s.id === session.id);
        const values = getPropertyValues(session.data.points, selectedProperty);
        return {
          id: session.id,
          name: session.fileName.replace(/\.[^/.]+$/, ''), // Remove extension
          colorIndex,
          values,
          stats: calculateDescriptiveStats(values),
        };
      });
  }, [fileSessions, selectedSessionIds, selectedProperty]);

  if (fileSessions.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-mono text-sm mb-2">
            Cross-sample analysis requires multiple files
          </p>
          <p className="text-muted-foreground/70 font-mono text-xs">
            Load at least 2 data files using the "Load File" button to compare samples.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Sample Selection */}
      <div className="w-64 border-r-2 border-border bg-card p-4 flex flex-col">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
          Cross-Sample Analysis
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

        {/* Sample Selection */}
        <div className="flex-1 min-h-0">
          <SampleSelector
            sessions={fileSessions}
            selectedSessionIds={selectedSessionIds}
            onSelectionChange={setSelectedSessionIds}
          />
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <TabsList className="bg-secondary">
              <TabsTrigger value="overview" className="font-mono text-sm gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="comparison" className="font-mono text-sm gap-2">
                <GitCompare className="w-4 h-4" />
                Statistical Tests
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {sampleData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <Layers className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground font-mono text-sm mb-1">
                      No samples selected
                    </p>
                    <p className="text-muted-foreground/70 font-mono text-xs">
                      Select samples from the sidebar to begin cross-sample analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <CrossSampleStats samples={sampleData} selectedProperty={selectedProperty} />
                    <CrossSamplePlots
                      samples={sampleData}
                      selectedProperty={selectedProperty}
                      showViolin={showViolin}
                      showJitter={showJitter}
                    />
                  </TabsContent>

                  <TabsContent value="comparison" className="mt-0 space-y-4">
                    <CrossSampleTests samples={sampleData} selectedProperty={selectedProperty} />
                  </TabsContent>
                </>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};
