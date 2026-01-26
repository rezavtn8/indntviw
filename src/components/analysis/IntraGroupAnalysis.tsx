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
  tukeyHSD,
  shapiroWilkTest,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BoxViolinPlots } from './BoxViolinPlots';
import { SmartZoneAnalysis } from './SmartZoneAnalysis';
import { IntraGroupZoneComparison } from './IntraGroupZoneComparison';
import { CheckCircle, XCircle, BarChart3, FlaskConical, MapPin } from 'lucide-react';

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

  // Ensure selectedGroupId is always valid - sync with groups
  const effectiveGroupId = useMemo(() => {
    if (groups.length === 0) return '';
    if (selectedGroupId && groups.find(g => g.id === selectedGroupId)) {
      return selectedGroupId;
    }
    return groups[0].id;
  }, [groups, selectedGroupId]);

  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
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
  const normalityTests = useMemo(() => {
    return sampleData.map(s => ({
      name: s.name,
      test: shapiroWilkTest(s.values),
    }));
  }, [sampleData]);

  // Two-sample tests (if exactly 2 samples in group)
  const twoSampleTests = useMemo(() => {
    if (sampleData.length !== 2) return null;
    const [s1, s2] = sampleData;
    return {
      welch: welchTTest(s1.values, s2.values),
      mannWhitney: mannWhitneyU(s1.values, s2.values),
      effectSize: calculateEffectSize(s1.values, s2.values),
    };
  }, [sampleData]);

  // Multi-sample tests (if 2+ samples in group)
  const multiSampleTests = useMemo(() => {
    if (sampleData.length < 2) return null;
    const valueArrays = sampleData.map(s => s.values);
    const namedGroups = sampleData.map(s => ({ name: s.name, values: s.values }));
    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: sampleData.length > 2 ? tukeyHSD(namedGroups) : null,
    };
  }, [sampleData]);

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
            </div>

            {/* Box Plot */}
            {boxPlotData.length > 0 && (
              <BoxViolinPlots
                data={boxPlotData}
                selectedProperty={selectedProperty}
                showViolin={showViolin}
                showJitter={showJitter}
                xAxisLabel="Samples (within Group)"
              />
            )}

            {/* Statistics Table */}
            <div className="border border-border rounded p-2">
              <h5 className="font-mono text-xs font-bold uppercase mb-2">
                Sample Statistics ({getPropertyLabel(selectedProperty)})
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-1">Sample</th>
                      <th className="text-right p-1">N</th>
                      <th className="text-right p-1">Mean</th>
                      <th className="text-right p-1">SD</th>
                      <th className="text-right p-1">Median</th>
                      <th className="text-right p-1">IQR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((s, idx) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="p-1 truncate max-w-[120px]">{s.name}</td>
                        <td className="text-right p-1">{s.stats.n}</td>
                        <td className="text-right p-1">{formatValue(s.stats.mean)}</td>
                        <td className="text-right p-1">{formatValue(s.stats.sd)}</td>
                        <td className="text-right p-1">{formatValue(s.stats.median)}</td>
                        <td className="text-right p-1">{formatValue(s.stats.iqr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-3 mt-0">
            {/* Normality Tests */}
            <div className="border border-border rounded p-2 space-y-2">
              <h5 className="font-mono text-xs font-bold uppercase">Normality Tests (Shapiro-Wilk)</h5>
              <div className="space-y-1">
                {normalityTests.map(({ name, test }) => (
                  <div key={name} className="flex items-center justify-between p-1.5 bg-muted/20 rounded text-[10px] font-mono">
                    <span className="truncate max-w-[120px]">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">W={test.shapiroWilk.statistic.toFixed(3)}</span>
                      <span className="text-muted-foreground">p={formatP(test.shapiroWilk.pValue)}</span>
                      <Badge variant={test.isNormal ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                        {test.isNormal ? 'Normal' : 'Non-normal'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-Sample Tests */}
            {twoSampleTests && (
              <div className="border border-border rounded p-2 space-y-2">
                <h5 className="font-mono text-xs font-bold uppercase">Two-Sample Comparison</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted/30 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">Welch's t</span>
                      <Badge variant={twoSampleTests.welch.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                        {twoSampleTests.welch.isSignificant ? 'Sig' : 'NS'}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      t={twoSampleTests.welch.statistic.toFixed(2)}, p={formatP(twoSampleTests.welch.pValue)}
                    </div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">Mann-Whitney</span>
                      <Badge variant={twoSampleTests.mannWhitney.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                        {twoSampleTests.mannWhitney.isSignificant ? 'Sig' : 'NS'}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      p={formatP(twoSampleTests.mannWhitney.pValue)}
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <span className="font-mono text-[10px] font-bold">Effect: </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize ml-1">
                    {twoSampleTests.effectSize.interpretation}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground ml-2">
                    d={twoSampleTests.effectSize.cohensD.toFixed(2)}, g={twoSampleTests.effectSize.hedgesG.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Multi-Sample Tests */}
            {multiSampleTests && sampleData.length > 2 && (
              <div className="border border-border rounded p-2 space-y-2">
                <h5 className="font-mono text-xs font-bold uppercase">Multi-Sample Comparison ({sampleData.length} samples)</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted/30 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">ANOVA</span>
                      <Badge variant={multiSampleTests.anova.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                        {multiSampleTests.anova.isSignificant ? 'Sig' : 'NS'}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      F={multiSampleTests.anova.fStatistic.toFixed(2)}, p={formatP(multiSampleTests.anova.pValue)}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      η²={multiSampleTests.anova.etaSquared.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold">Kruskal-Wallis</span>
                      <Badge variant={multiSampleTests.kruskalWallis.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                        {multiSampleTests.kruskalWallis.isSignificant ? 'Sig' : 'NS'}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      H={multiSampleTests.kruskalWallis.hStatistic.toFixed(2)}, p={formatP(multiSampleTests.kruskalWallis.pValue)}
                    </div>
                  </div>
                </div>
                {multiSampleTests.postHoc && multiSampleTests.postHoc.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold">Post-hoc (Tukey HSD)</span>
                    <ScrollArea className="h-24">
                      <div className="space-y-1">
                        {multiSampleTests.postHoc.map((ph, idx) => (
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
