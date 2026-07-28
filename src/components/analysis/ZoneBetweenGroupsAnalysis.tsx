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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BoxViolinPlots, SampleColoredGroup } from './BoxViolinPlots';
import { MapPin, Layers } from 'lucide-react';

interface ZoneBetweenGroupsAnalysisProps {
  fileSessions: FileSession[];
  groups: SampleGroup[];
  selectedProperty: string;
}

interface GroupZoneData {
  group: SampleGroup;
  zoneName: string;
  values: number[];
  stats: DescriptiveStats;
  color: string;
}

export const ZoneBetweenGroupsAnalysis: React.FC<ZoneBetweenGroupsAnalysisProps> = ({
  fileSessions,
  groups,
  selectedProperty,
}) => {
  const [selectedZoneName, setSelectedZoneName] = useState<string>('');
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showSampleColors, setShowSampleColors] = useState(false);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);

  // Find all unique zone names across all sessions in groups
  const allZoneNames = useMemo(() => {
    const names = new Set<string>();
    groups.forEach(group => {
      const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
      groupSessions.forEach(session => {
        session.zones.forEach(zone => names.add(zone.name));
      });
    });
    return Array.from(names).sort();
  }, [groups, fileSessions]);

  // Auto-select first zone if none selected
  React.useEffect(() => {
    if (allZoneNames.length > 0 && !allZoneNames.includes(selectedZoneName)) {
      setSelectedZoneName(allZoneNames[0]);
    }
  }, [allZoneNames, selectedZoneName]);

  // Aggregate zone data by group for the selected zone name
  const groupZoneData = useMemo((): GroupZoneData[] => {
    if (!selectedZoneName) return [];

    return groups.map(group => {
      const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
      
      // Collect all values from zones with matching name in this group
      const allValues: number[] = [];
      groupSessions.forEach(session => {
        const matchingZones = session.zones.filter(z => z.name === selectedZoneName);
        matchingZones.forEach(zone => {
          const zonePoints = session.data.points.filter(p => zone.memberPointIds.includes(p.id));
          const values = getPropertyValues(zonePoints, selectedProperty);
          allValues.push(...values);
        });
      });

      return {
        group,
        zoneName: selectedZoneName,
        values: allValues,
        stats: calculateDescriptiveStats(allValues),
        color: group.color,
      };
    }).filter(d => d.values.length > 0);
  }, [fileSessions, groups, selectedZoneName, selectedProperty]);

  const boxPlotData = useMemo(() => {
    return groupZoneData.map(d => ({
      name: d.group.name,
      color: d.color,
      values: d.values,
      stats: d.stats,
    }));
  }, [groupZoneData]);

  // Build per-sample colored data: each session within a group is a separate colored sample
  const sampleColoredData = useMemo((): SampleColoredGroup[] | undefined => {
    if (!showSampleColors || !selectedZoneName) return undefined;

    // Collect all unique sessions across groups for global color assignment
    const allSessionIds: string[] = [];
    groups.forEach(group => {
      fileSessions.filter(s => group.sessionIds.includes(s.id)).forEach(s => {
        if (!allSessionIds.includes(s.id)) allSessionIds.push(s.id);
      });
    });

    const SAMPLE_COLORS = [
      '#e6194b', '#3cb44b', '#4363d8', '#f58231',
      '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
      '#fabed4', '#469990', '#dcbeff', '#9A6324',
    ];

    return groupZoneData.map((d, groupIdx) => {
      const groupSessions = fileSessions.filter(s => d.group.sessionIds.includes(s.id));
      return {
        groupIdx,
        samples: groupSessions.flatMap(session => {
          const matchingZones = session.zones.filter(z => z.name === selectedZoneName);
          const values: number[] = [];
          matchingZones.forEach(zone => {
            const zonePoints = session.data.points.filter(p => zone.memberPointIds.includes(p.id));
            values.push(...getPropertyValues(zonePoints, selectedProperty));
          });
          if (values.length === 0) return [];
          const globalIdx = allSessionIds.indexOf(session.id);
          return [{
            name: session.fileName.replace(/\.[^/.]+$/, ''),
            color: SAMPLE_COLORS[globalIdx % SAMPLE_COLORS.length],
            values,
          }];
        }),
      };
    }).filter(g => g.samples.length > 0);
  }, [showSampleColors, selectedZoneName, groupZoneData, fileSessions, groups, selectedProperty]);

  const boxPlotKey = useMemo(() => {
    return `${selectedZoneName}-${groupZoneData.map(d => `${d.group.id}:${d.values.length}`).join('|')}`;
  }, [selectedZoneName, groupZoneData]);

  const twoGroupTests = useMemo(() => {
    if (groupZoneData.length !== 2) return null;
    const [g1, g2] = groupZoneData;
    return {
      welch: welchTTest(g1.values, g2.values),
      mannWhitney: mannWhitneyU(g1.values, g2.values),
      effectSize: calculateEffectSize(g1.values, g2.values),
    };
  }, [groupZoneData]);

  const multiGroupTests = useMemo(() => {
    if (groupZoneData.length < 2) return null;
    const valueArrays = groupZoneData.map(g => g.values);
    const namedGroups = groupZoneData.map(g => ({ name: g.group.name, values: g.values }));
    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: groupZoneData.length > 2 ? pairwisePostHoc(namedGroups) : null,
    };
  }, [groupZoneData]);

  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };
  const getPropertyLabel = (key: string): string => PROPERTY_CONFIGS.find(c => c.key === key)?.label || key;

  if (groups.length < 2) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <Layers className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground font-mono text-xs">At least 2 treatment groups needed</p>
        <p className="text-muted-foreground/70 font-mono text-[10px]">Create groups in the sidebar to compare zones between them</p>
      </div>
    );
  }

  if (allZoneNames.length === 0) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground font-mono text-xs">No zones in grouped samples</p>
        <p className="text-muted-foreground/70 font-mono text-[10px]">Create zones in samples that belong to groups</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zone Selector */}
      <div className="flex items-center gap-3 p-2 bg-muted/30 rounded">
        <Label className="font-mono text-xs">Zone:</Label>
        <Select value={selectedZoneName} onValueChange={setSelectedZoneName}>
          <SelectTrigger className="w-40 h-7 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allZoneNames.map(name => (
              <SelectItem key={name} value={name} className="font-mono text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
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

      {/* Info badge */}
      <div className="text-xs font-mono text-muted-foreground">
        Comparing <span className="font-bold">"{selectedZoneName}"</span> across {groupZoneData.length} treatment groups (pooled from all samples in each group)
      </div>

      {/* Box Plot */}
      {groupZoneData.length > 0 && (
        <BoxViolinPlots
          key={boxPlotKey}
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

      {/* Statistics Table */}
      {groupZoneData.length > 0 && (
        <div className="border border-border rounded p-2">
          <h4 className="font-mono text-xs font-bold uppercase mb-2">
            {selectedZoneName} by Group ({getPropertyLabel(selectedProperty)})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">Group</th>
                  <th className="text-right p-1">N</th>
                  <th className="text-right p-1">Mean</th>
                  <th className="text-right p-1">SD</th>
                  <th className="text-right p-1">Med</th>
                  <th className="text-right p-1">Min</th>
                  <th className="text-right p-1">Max</th>
                </tr>
              </thead>
              <tbody>
                {groupZoneData.map((d, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="truncate max-w-[100px]">{d.group.name}</span>
                      </div>
                    </td>
                    <td className="text-right p-1">{d.stats.n}</td>
                    <td className="text-right p-1">{formatValue(d.stats.mean)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.sd)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.median)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.min)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                t = {formatValue(twoGroupTests.welch.statistic)}, p = {formatP(twoGroupTests.welch.pValue)}
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
                U = {formatValue(twoGroupTests.mannWhitney.uStatistic)}, p = {formatP(twoGroupTests.mannWhitney.pValue)}
              </div>
            </div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <span className="font-mono text-[10px] font-bold">Effect Size: </span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize ml-1">
              {twoGroupTests.effectSize.interpretation}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground ml-2">
              Cohen's d = {twoGroupTests.effectSize.cohensD.toFixed(2)}, Hedges' g = {twoGroupTests.effectSize.hedgesG.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Multi-Group Tests */}
      {multiGroupTests && groupZoneData.length > 2 && (
        <div className="border border-border rounded p-2 space-y-2">
          <h4 className="font-mono text-xs font-bold uppercase">Multi-Group Comparison ({groupZoneData.length} groups)</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">ANOVA</span>
                <Badge variant={multiGroupTests.anova.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiGroupTests.anova.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                F = {formatValue(multiGroupTests.anova.fStatistic)}, p = {formatP(multiGroupTests.anova.pValue)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Kruskal-Wallis</span>
                <Badge variant={multiGroupTests.kruskalWallis.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiGroupTests.kruskalWallis.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                H = {formatValue(multiGroupTests.kruskalWallis.hStatistic)}, p = {formatP(multiGroupTests.kruskalWallis.pValue)}
              </div>
            </div>
          </div>

          {/* Post-hoc */}
          {multiGroupTests.postHoc && multiGroupTests.postHoc.length > 0 && (
            <div className="pt-2 border-t border-border">
              <span className="font-mono text-[10px] font-bold">Pairwise post-hoc (Holm):</span>
              <div className="mt-1 grid grid-cols-1 gap-1">
                {multiGroupTests.postHoc.map((ph, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-muted-foreground">{ph.group1} vs {ph.group2}:</span>
                    <Badge variant={ph.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                      {ph.isSignificant ? 'Sig' : 'NS'}
                    </Badge>
                    <span className="text-muted-foreground">p = {formatP(ph.pValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
