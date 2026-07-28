import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from './SampleGrouping';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import {
  calculateDescriptiveStats,
  getPropertyValues,
  welchTTest,
  mannWhitneyU,
  calculateEffectSize,
  oneWayANOVA,
  kruskalWallis,
  pairwisePostHoc,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BoxViolinPlots, SampleColoredGroup } from './BoxViolinPlots';
import { StatsTable } from './StatsTable';
import { CheckCircle, XCircle, Users } from 'lucide-react';

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

  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };
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

  const twoGroupTests = useMemo(() => {
    if (groupData.length !== 2) return null;
    const [g1, g2] = groupData;
    return {
      welch: welchTTest(g1.values, g2.values),
      mannWhitney: mannWhitneyU(g1.values, g2.values),
      effectSize: calculateEffectSize(g1.values, g2.values),
    };
  }, [groupData]);

  const multiGroupTests = useMemo(() => {
    if (groupData.length < 2) return null;
    const valueArrays = groupData.map(g => g.values);
    const namedGroups = groupData.map(g => ({ name: g.group.name, values: g.values }));
    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: groupData.length > 2 ? pairwisePostHoc(namedGroups) : null,
    };
  }, [groupData]);

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

      {/* Two-Group Tests */}
      {twoGroupTests && (
        <div className="border border-border rounded p-2 space-y-2">
          <h4 className="font-mono text-xs font-bold uppercase">Two-Group Comparison</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Welch's t</span>
                <Badge variant={twoGroupTests.welch.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {twoGroupTests.welch.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                t={twoGroupTests.welch.statistic.toFixed(2)}, p={formatP(twoGroupTests.welch.pValue)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Mann-Whitney</span>
                <Badge variant={twoGroupTests.mannWhitney.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {twoGroupTests.mannWhitney.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                p={formatP(twoGroupTests.mannWhitney.pValue)}
              </div>
            </div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <span className="font-mono text-[10px] font-bold">Effect: </span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize ml-1">
              {twoGroupTests.effectSize.interpretation}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground ml-2">
              d={twoGroupTests.effectSize.cohensD.toFixed(2)}, g={twoGroupTests.effectSize.hedgesG.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Multi-Group Tests */}
      {multiGroupTests && groupData.length > 2 && (
        <div className="border border-border rounded p-2 space-y-2">
          <h4 className="font-mono text-xs font-bold uppercase">Multi-Group ({groupData.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">ANOVA</span>
                <Badge variant={multiGroupTests.anova.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiGroupTests.anova.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                F={multiGroupTests.anova.fStatistic.toFixed(2)}, p={formatP(multiGroupTests.anova.pValue)}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                η²={multiGroupTests.anova.etaSquared.toFixed(3)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Kruskal-W</span>
                <Badge variant={multiGroupTests.kruskalWallis.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiGroupTests.kruskalWallis.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                H={multiGroupTests.kruskalWallis.hStatistic.toFixed(2)}, p={formatP(multiGroupTests.kruskalWallis.pValue)}
              </div>
            </div>
          </div>
          {multiGroupTests.postHoc && multiGroupTests.postHoc.length > 0 && (
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold">Post-hoc (Holm)</span>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {multiGroupTests.postHoc.map((ph, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1 bg-muted/20 rounded text-[10px] font-mono">
                      <span className="truncate max-w-[100px]">{ph.group1} vs {ph.group2}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Δ={ph.meanDiff.toFixed(2)}</span>
                        <span className="text-muted-foreground">p={formatP(ph.pValue)}</span>
                        {ph.isSignificant ? <CheckCircle className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
