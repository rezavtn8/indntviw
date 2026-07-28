import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from './SampleGrouping';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import {
  calculateDescriptiveStats,
  getPropertyValues,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BoxViolinPlots, SampleColoredGroup } from './BoxViolinPlots';
import { StatsTable } from './StatsTable';
import { ComparisonReport } from './ComparisonReport';
import { Users } from 'lucide-react';

// 12-color palette for per-sample differentiation (distinct from treatment group colors)
const SAMPLE_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#fabed4', '#469990', '#dcbeff', '#9A6324',
];

interface GroupData {
  group: SampleGroup;
  values: number[];
  stats: DescriptiveStats;
  sampleCount: number;
}

interface GroupComparisonProps {
  fileSessions: FileSession[];
  groups: SampleGroup[];
  selectedProperty: string;
}

export const GroupComparison: React.FC<GroupComparisonProps> = ({ fileSessions, groups, selectedProperty }) => {
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showSampleColors, setShowSampleColors] = useState(false);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);

  const getPropertyLabel = (key: string): string => PROPERTY_CONFIGS.find(c => c.key === key)?.label || key;

  const groupData = useMemo((): GroupData[] => {
    return groups
      .filter(g => g.sessionIds.length > 0)
      .map(group => {
        const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
        const allValues: number[] = [];
        groupSessions.forEach(session => {
          const values = getPropertyValues(session.data.points, selectedProperty);
          allValues.push(...values);
        });
        return { group, values: allValues, stats: calculateDescriptiveStats(allValues), sampleCount: groupSessions.length };
      })
      .filter(g => g.values.length > 0);
  }, [fileSessions, groups, selectedProperty]);

  // Prepare data for BoxViolinPlots
  const boxPlotData = useMemo(() => {
    return groupData.map(g => ({
      name: g.group.name,
      color: g.group.color,
      values: g.values,
      stats: g.stats,
    }));
  }, [groupData]);

  // Build per-sample colored data for sample colors mode
  const sampleColoredData = useMemo((): SampleColoredGroup[] | undefined => {
    if (!showSampleColors) return undefined;

    // Collect all unique sessions across groups to assign global color indices
    // Each session gets a color based on its position in the global sample list
    const allSessionIds: string[] = [];
    groups.filter(g => g.sessionIds.length > 0).forEach(group => {
      group.sessionIds.forEach(id => {
        if (!allSessionIds.includes(id)) allSessionIds.push(id);
      });
    });

    return groupData.map((gd, groupIdx) => {
      const groupSessions = fileSessions.filter(s => gd.group.sessionIds.includes(s.id));
      return {
        groupIdx,
        samples: groupSessions.map((session) => {
          const globalIdx = allSessionIds.indexOf(session.id);
          const color = SAMPLE_COLORS[globalIdx % SAMPLE_COLORS.length];
          const values = getPropertyValues(session.data.points, selectedProperty);
          return {
            name: session.fileName,
            color,
            values,
          };
        }),
      };
    });
  }, [showSampleColors, groupData, fileSessions, groups, selectedProperty]);

  if (groups.length === 0) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground font-mono text-xs">No groups defined</p>
        <p className="text-muted-foreground/70 font-mono text-[10px]">Create groups to compare samples</p>
      </div>
    );
  }

  if (groupData.length < 2) {
    return (
      <div className="border border-border rounded p-3">
        <p className="text-muted-foreground font-mono text-xs text-center">
          Add samples to at least 2 groups
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Plot Options */}
      <div className="flex flex-wrap items-center gap-4 p-2 bg-muted/30 rounded">
        <div className="flex items-center gap-2">
          <Label className="font-mono text-[10px]">Violin</Label>
          <Switch checked={showViolin} onCheckedChange={setShowViolin} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="font-mono text-[10px]">Points</Label>
          <Switch checked={showJitter} onCheckedChange={setShowJitter} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="font-mono text-[10px]">Sample Colors</Label>
          <Switch checked={showSampleColors} onCheckedChange={setShowSampleColors} />
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
          blackAndWhite={showSampleColors}
          sampleColoredData={sampleColoredData}
          blendOverlap={showScatterDensity}
          smallDots={showSmallDots}
        />
      )}

      {/* Group Statistics */}
      <StatsTable
        rows={groupData.map(g => ({
          id: g.group.id,
          name: g.group.name,
          color: g.group.color,
          stats: g.stats,
          sampleCount: g.sampleCount,
        }))}
        title={`Stats (${getPropertyLabel(selectedProperty)})`}
        showSampleCount={true}
        showIQR={false}
      />

      <ComparisonReport
        groups={groupData.map(g => ({
          name: g.group.name,
          values: g.values,
          color: g.group.color,
        }))}
        title="Between-Group Tests (pooled)"
        unit="indents"
        compact
      />
    </div>
  );
};
