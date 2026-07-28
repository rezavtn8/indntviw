import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from './SampleGrouping';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import {
  calculateDescriptiveStats,
  getPropertyValues,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { getSampleColor } from './SampleSelector';
import { ComparisonReport } from './ComparisonReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BoxViolinPlots } from './BoxViolinPlots';
import { SmartZoneAnalysis } from './SmartZoneAnalysis';
import { IntraGroupZoneComparison } from './IntraGroupZoneComparison';
import { StatsTable } from './StatsTable';
import { BarChart3, FlaskConical, MapPin } from 'lucide-react';

interface SampleData {
  id: string;
  name: string;
  values: number[];
  stats: DescriptiveStats;
  colorIndex: number;
}

interface IntraGroupAnalysisProps {
  fileSessions: FileSession[];
  groups: SampleGroup[];
  selectedProperty: string;
}

export const IntraGroupAnalysis: React.FC<IntraGroupAnalysisProps> = ({
  fileSessions,
  groups,
  selectedProperty,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);

  // Ensure selectedGroupId is always valid - sync with groups
  const effectiveGroupId = useMemo(() => {
    if (groups.length === 0) return '';
    if (selectedGroupId && groups.find(g => g.id === selectedGroupId)) {
      return selectedGroupId;
    }
    return groups[0].id;
  }, [groups, selectedGroupId]);

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };
  const getPropertyLabel = (key: string): string => PROPERTY_CONFIGS.find(c => c.key === key)?.label || key;

  // Get the selected group using effective ID
  const selectedGroup = useMemo(() => {
    return groups.find(g => g.id === effectiveGroupId) || null;
  }, [groups, effectiveGroupId]);

  // Get sessions that belong to the selected group
  const groupSessions = useMemo(() => {
    if (!selectedGroup) return [];
    return fileSessions.filter(s => selectedGroup.sessionIds.includes(s.id));
  }, [fileSessions, selectedGroup]);

  // Prepare sample data for analysis (each sample within the group)
  const sampleData = useMemo((): SampleData[] => {
    return groupSessions.map((session, idx) => {
      const values = getPropertyValues(session.data.points, selectedProperty);
      return {
        id: session.id,
        name: session.fileName.replace(/\.[^/.]+$/, ''),
        values,
        stats: calculateDescriptiveStats(values),
        colorIndex: idx,
      };
    }).filter(s => s.values.length > 0);
  }, [groupSessions, selectedProperty]);

  // Prepare data for BoxViolinPlots
  const boxPlotData = useMemo(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return sampleData.map((s, idx) => ({
      name: s.name,
      color: colors[idx % colors.length],
      values: s.values,
      stats: s.stats,
    }));
  }, [sampleData]);

  // Normality tests for each sample
  // Two-sample tests (if exactly 2 samples in group)
  // Multi-sample tests (if 2+ samples in group)
  if (groups.length === 0) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <p className="text-muted-foreground font-mono text-xs">
          Create treatment groups to analyze samples within each group
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded">
      {/* Group Selector Header */}
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <Label className="font-mono text-xs uppercase text-muted-foreground whitespace-nowrap">
            Analyze Group:
          </Label>
          <Select value={effectiveGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="font-mono text-sm flex-1 max-w-[200px]">
              <SelectValue placeholder="Select group..." />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id} className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: group.color }} />
                    <span>{group.name}</span>
                    <span className="text-muted-foreground">({group.sessionIds.length})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {!selectedGroup || groupSessions.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-muted-foreground font-mono text-xs">
            Add samples to this group to analyze
          </p>
        </div>
      ) : groupSessions.length === 1 ? (
        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-muted-foreground font-mono text-xs">
              Only 1 sample in group — showing statistics only
            </p>
          </div>
          {sampleData.length > 0 && (
            <div className="border border-border rounded p-2">
              <h5 className="font-mono text-xs font-bold uppercase mb-2">
                {sampleData[0].name}
              </h5>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                <div><span className="text-muted-foreground">N:</span> {sampleData[0].stats.n}</div>
                <div><span className="text-muted-foreground">Mean:</span> {formatValue(sampleData[0].stats.mean)}</div>
                <div><span className="text-muted-foreground">SD:</span> {formatValue(sampleData[0].stats.sd)}</div>
                <div><span className="text-muted-foreground">Median:</span> {formatValue(sampleData[0].stats.median)}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="p-3">
          <TabsList className="mb-3 bg-secondary">
            <TabsTrigger value="overview" className="font-mono text-xs gap-1.5">
              <BarChart3 className="w-3 h-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tests" className="font-mono text-xs gap-1.5">
              <FlaskConical className="w-3 h-3" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="zones" className="font-mono text-xs gap-1.5">
              <MapPin className="w-3 h-3" />
              Zones
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 mt-0">
            {/* Plot Options */}
            <div className="flex items-center gap-4 p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-2">
                <Label className="font-mono text-[10px]">Violin</Label>
                <Switch checked={showViolin} onCheckedChange={setShowViolin} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="font-mono text-[10px]">Points</Label>
                <Switch checked={showJitter} onCheckedChange={setShowJitter} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="font-mono text-[10px]">Scatter Density</Label>
                <Switch checked={showScatterDensity} onCheckedChange={setShowScatterDensity} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="font-mono text-[10px]">Small Dots</Label>
                <Switch checked={showSmallDots} onCheckedChange={setShowSmallDots} />
              </div>
            </div>

            {/* Box Plot */}
            {boxPlotData.length > 0 && (
              <BoxViolinPlots
                data={boxPlotData}
                selectedProperty={selectedProperty}
                showViolin={showViolin}
                showJitter={showJitter}
                blendOverlap={showScatterDensity}
                smallDots={showSmallDots}
                xAxisLabel={`Samples (within Group ${selectedGroup?.name || ''})`}
              />
            )}

            {/* Statistics Table */}
            <StatsTable
              rows={sampleData.map(s => ({
                id: s.id,
                name: s.name,
                stats: s.stats,
              }))}
              title={`Sample Statistics (${getPropertyLabel(selectedProperty)})`}
              showIQR={true}
            />
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-3 mt-0">
            <ComparisonReport
              groups={sampleData.map(sd => ({ name: sd.name, values: sd.values, color: getSampleColor(sd.colorIndex) }))}
              title="Within-Group Sample Tests"
              unit="indents"
              compact
            />
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones" className="space-y-4 mt-0">
            {/* Zone Comparison Within Group */}
            <div className="border border-border rounded p-3">
              <h5 className="font-mono text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Compare Zones Within Group
              </h5>
              <p className="text-muted-foreground font-mono text-[10px] mb-3">
                Comparing different zone types (pooled across all "{selectedGroup?.name}" samples)
              </p>
              <IntraGroupZoneComparison
                groupSessions={groupSessions}
                selectedProperty={selectedProperty}
                showViolin={showViolin}
                showJitter={showJitter}
                blendOverlap={showScatterDensity}
                smallDots={showSmallDots}
              />
            </div>

            {/* Per-Zone Across Samples */}
            <div className="border border-border rounded p-3">
              <h5 className="font-mono text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Same Zone Across Samples
              </h5>
              <p className="text-muted-foreground font-mono text-[10px] mb-3">
                Comparing same-named zones between different samples in "{selectedGroup?.name}"
              </p>
              <SmartZoneAnalysis
                fileSessions={groupSessions}
                selectedProperty={selectedProperty}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
