import React, { useMemo, useState } from 'react';
import { Zone } from '@/types/zones';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { getPointsInZone } from '@/utils/zoneUtils';
import { calculateDescriptiveStats, DescriptiveStats, welchTTest, mannWhitneyU, calculateEffectSize, oneWayANOVA, kruskalWallis, tukeyHSD } from '@/utils/advancedStatistics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BoxViolinPlots } from '@/components/analysis/BoxViolinPlots';
import { BarChart3, CheckCircle, XCircle } from 'lucide-react';

interface ZoneComparisonPanelProps {
  zones: Zone[];
  points: IndentationPoint[];
  selectedProperty: string;
  comparedZoneIds: string[];
  onToggleCompare: (zoneId: string) => void;
}

interface ZoneStats {
  zone: Zone;
  values: number[];
  stats: DescriptiveStats;
}

export const ZoneComparisonPanel: React.FC<ZoneComparisonPanelProps> = ({
  zones,
  points,
  selectedProperty,
  comparedZoneIds,
  onToggleCompare,
}) => {
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);

  const zoneStats = useMemo((): ZoneStats[] => {
    return zones.map(zone => {
      const zonePoints = getPointsInZone(points, zone);
      const values = zonePoints
        .map(p => p.properties[selectedProperty])
        .filter(v => v !== undefined && !isNaN(v));
      return { zone, values, stats: calculateDescriptiveStats(values) };
    });
  }, [zones, points, selectedProperty]);

  const comparedStats = useMemo(() => {
    return zoneStats.filter(s => comparedZoneIds.includes(s.zone.id));
  }, [zoneStats, comparedZoneIds]);

  // Prepare data for BoxViolinPlots
  const boxPlotData = useMemo(() => {
    return comparedStats.map(s => ({
      name: s.zone.name,
      color: s.zone.color,
      values: s.values,
      stats: s.stats,
    }));
  }, [comparedStats]);

  // Two-zone tests
  const twoZoneTests = useMemo(() => {
    if (comparedStats.length !== 2) return null;
    const [z1, z2] = comparedStats;
    if (z1.values.length < 2 || z2.values.length < 2) return null;
    return {
      welch: welchTTest(z1.values, z2.values),
      mannWhitney: mannWhitneyU(z1.values, z2.values),
      effectSize: calculateEffectSize(z1.values, z2.values),
    };
  }, [comparedStats]);

  // Multi-zone tests
  const multiZoneTests = useMemo(() => {
    if (comparedStats.length < 2) return null;
    const valueArrays = comparedStats.map(s => s.values);
    const namedGroups = comparedStats.map(s => ({ name: s.zone.name, values: s.values }));
    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: comparedStats.length > 2 ? tukeyHSD(namedGroups) : null,
    };
  }, [comparedStats]);

  const getPropertyLabel = (key: string): string => PROPERTY_CONFIGS.find(c => c.key === key)?.label || key;
  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };

  if (zones.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-muted-foreground text-xs font-mono">Create zones to compare regions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {/* Zone Selection */}
      <div className="space-y-1">
        <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
          Select Zones
        </h4>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {zones.map(zone => {
            const isCompared = comparedZoneIds.includes(zone.id);
            return (
              <label
                key={zone.id}
                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                  isCompared ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={isCompared}
                  onCheckedChange={() => onToggleCompare(zone.id)}
                  className="h-3 w-3"
                />
                <div className="w-2 h-2 rounded" style={{ backgroundColor: zone.color }} />
                <span className="font-mono truncate flex-1">{zone.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Plot Options & BoxPlot */}
      {comparedStats.length > 0 && (
        <>
          <div className="flex items-center gap-3 p-1.5 bg-muted/30 rounded">
            <div className="flex items-center gap-1">
              <Label className="font-mono text-[10px]">Violin</Label>
              <Switch checked={showViolin} onCheckedChange={setShowViolin} />
            </div>
            <div className="flex items-center gap-1">
              <Label className="font-mono text-[10px]">Points</Label>
              <Switch checked={showJitter} onCheckedChange={setShowJitter} />
            </div>
          </div>

          {boxPlotData.length > 0 && (
            <BoxViolinPlots
              data={boxPlotData}
              selectedProperty={selectedProperty}
              showViolin={showViolin}
              showJitter={showJitter}
            />
          )}

          {/* Stats Table */}
          <div className="border border-border rounded p-2">
            <h4 className="font-mono text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {getPropertyLabel(selectedProperty)}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-1">Zone</th>
                    <th className="text-right p-1">N</th>
                    <th className="text-right p-1">Mean</th>
                    <th className="text-right p-1">SD</th>
                    <th className="text-right p-1">Med</th>
                  </tr>
                </thead>
                <tbody>
                  {comparedStats.map(s => (
                    <tr key={s.zone.id} className="border-b border-border/50">
                      <td className="p-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: s.zone.color }} />
                          <span className="truncate max-w-[60px]">{s.zone.name}</span>
                        </div>
                      </td>
                      <td className="text-right p-1">{s.stats.n}</td>
                      <td className="text-right p-1">{formatValue(s.stats.mean)}</td>
                      <td className="text-right p-1">{formatValue(s.stats.sd)}</td>
                      <td className="text-right p-1">{formatValue(s.stats.median)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Zone Tests */}
          {twoZoneTests && (
            <div className="border border-border rounded p-2 space-y-1">
              <h4 className="font-mono text-[10px] font-bold uppercase">Comparison</h4>
              <div className="grid grid-cols-2 gap-1">
                <div className="p-1.5 bg-muted/30 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold">Welch's t</span>
                    <Badge variant={twoZoneTests.welch.isSignificant ? "default" : "secondary"} className="text-[8px] h-3 px-1">
                      {twoZoneTests.welch.isSignificant ? 'Sig' : 'NS'}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">
                    p={formatP(twoZoneTests.welch.pValue)}
                  </div>
                </div>
                <div className="p-1.5 bg-muted/30 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold">M-W U</span>
                    <Badge variant={twoZoneTests.mannWhitney.isSignificant ? "default" : "secondary"} className="text-[8px] h-3 px-1">
                      {twoZoneTests.mannWhitney.isSignificant ? 'Sig' : 'NS'}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">
                    p={formatP(twoZoneTests.mannWhitney.pValue)}
                  </div>
                </div>
              </div>
              <div className="p-1.5 bg-muted/30 rounded text-[9px] font-mono">
                <span className="font-bold">Effect: </span>
                <Badge variant="outline" className="text-[8px] h-3 px-1 capitalize">
                  {twoZoneTests.effectSize.interpretation}
                </Badge>
                <span className="text-muted-foreground ml-1">d={twoZoneTests.effectSize.cohensD.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Multi-Zone Tests */}
          {multiZoneTests && comparedStats.length > 2 && (
            <div className="border border-border rounded p-2 space-y-1">
              <h4 className="font-mono text-[10px] font-bold uppercase">Multi-Zone ({comparedStats.length})</h4>
              <div className="grid grid-cols-2 gap-1">
                <div className="p-1.5 bg-muted/30 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold">ANOVA</span>
                    <Badge variant={multiZoneTests.anova.isSignificant ? "default" : "secondary"} className="text-[8px] h-3 px-1">
                      {multiZoneTests.anova.isSignificant ? 'Sig' : 'NS'}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">
                    F={multiZoneTests.anova.fStatistic.toFixed(2)}, p={formatP(multiZoneTests.anova.pValue)}
                  </div>
                </div>
                <div className="p-1.5 bg-muted/30 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold">K-W</span>
                    <Badge variant={multiZoneTests.kruskalWallis.isSignificant ? "default" : "secondary"} className="text-[8px] h-3 px-1">
                      {multiZoneTests.kruskalWallis.isSignificant ? 'Sig' : 'NS'}
                    </Badge>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">
                    H={multiZoneTests.kruskalWallis.hStatistic.toFixed(2)}, p={formatP(multiZoneTests.kruskalWallis.pValue)}
                  </div>
                </div>
              </div>
              {multiZoneTests.postHoc && multiZoneTests.postHoc.length > 0 && (
                <ScrollArea className="max-h-16">
                  <div className="space-y-0.5">
                    {multiZoneTests.postHoc.map((ph, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1 bg-muted/20 rounded text-[9px] font-mono">
                        <span className="truncate max-w-[80px]">{ph.group1} vs {ph.group2}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">p={formatP(ph.pValue)}</span>
                          {ph.isSignificant ? <CheckCircle className="w-2.5 h-2.5 text-primary" /> : <XCircle className="w-2.5 h-2.5 text-muted-foreground" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
