/**
 * Intra-Group Zone Comparison Component
 * 
 * Compares different zone types (e.g., Zone 1 vs Zone 2 vs Zone 3) within a single
 * treatment group by pooling data from all samples in that group.
 */

import React, { useMemo } from 'react';
import { FileSession } from '@/types/fileSession';
import {
  calculateDescriptiveStats,
  DescriptiveStats,
  welchTTest,
  mannWhitneyU,
  oneWayANOVA,
  kruskalWallis,
  tukeyHSD,
  calculateEffectSize,
  shapiroWilkTest,
  getPropertyValues,
} from '@/utils/advancedStatistics';
import { getPointsInZone } from '@/utils/zoneUtils';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { BoxViolinPlots } from './BoxViolinPlots';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IntraGroupZoneComparisonProps {
  groupSessions: FileSession[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
}

interface PooledZone {
  name: string;
  displayName: string;
  values: number[];
  stats: DescriptiveStats;
  sampleCount: number;
}

// Generate consistent colors for zones
const ZONE_COLORS = [
  'hsl(210, 70%, 50%)',  // Blue
  'hsl(140, 70%, 45%)',  // Green
  'hsl(45, 90%, 50%)',   // Yellow/Orange
  'hsl(340, 70%, 50%)',  // Pink/Red
  'hsl(270, 60%, 55%)',  // Purple
  'hsl(180, 60%, 45%)',  // Cyan
  'hsl(25, 80%, 50%)',   // Orange
  'hsl(300, 50%, 50%)',  // Magenta
];

const FONT_STYLE: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

export const IntraGroupZoneComparison: React.FC<IntraGroupZoneComparisonProps> = ({
  groupSessions,
  selectedProperty,
  showViolin = false,
  showJitter = true,
}) => {
  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) >= 1) return val.toFixed(2);
    return val.toFixed(4);
  };

  // Pool zones by name across all samples in the group
  const pooledZones = useMemo((): PooledZone[] => {
    const zoneMap = new Map<string, { displayName: string; values: number[]; samples: Set<string> }>();

    groupSessions.forEach(session => {
      session.zones.forEach(zone => {
        const normalizedName = zone.name.trim().toLowerCase();
        const points = getPointsInZone(session.data.points, zone);
        const values = getPropertyValues(points, selectedProperty);

        if (values.length === 0) return;

        if (!zoneMap.has(normalizedName)) {
          zoneMap.set(normalizedName, {
            displayName: zone.name.trim(),
            values: [],
            samples: new Set(),
          });
        }

        const entry = zoneMap.get(normalizedName)!;
        entry.values.push(...values);
        entry.samples.add(session.id);
      });
    });

    // Convert to array and calculate stats
    return Array.from(zoneMap.entries())
      .map(([name, data]) => ({
        name,
        displayName: data.displayName,
        values: data.values,
        stats: calculateDescriptiveStats(data.values),
        sampleCount: data.samples.size,
      }))
      .filter(z => z.values.length > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [groupSessions, selectedProperty]);

  // Prepare data for box plot
  const boxPlotData = useMemo(() => {
    return pooledZones.map((zone, index) => ({
      name: zone.displayName,
      color: ZONE_COLORS[index % ZONE_COLORS.length],
      values: zone.values,
      stats: zone.stats,
    }));
  }, [pooledZones]);

  // Statistical tests
  const statisticalTests = useMemo(() => {
    if (pooledZones.length < 2) return null;

    const groups = pooledZones.map(z => z.values);

    // Normality tests
    const normalityTests = pooledZones.map(z => ({
      name: z.displayName,
      ...shapiroWilkTest(z.values),
    }));

    const allNormal = normalityTests.every(t => t.isNormal);

    if (pooledZones.length === 2) {
      // Two-group comparison
      const welch = welchTTest(groups[0], groups[1]);
      const mannWhitney = mannWhitneyU(groups[0], groups[1]);
      const effectSize = calculateEffectSize(groups[0], groups[1]);

      return {
        normalityTests,
        allNormal,
        twoGroup: { welch, mannWhitney, effectSize },
        multiGroup: null,
      };
    } else {
      // Multi-group comparison
      const anova = oneWayANOVA(groups);
      const kw = kruskalWallis(groups);
      const tukey = tukeyHSD(pooledZones.map(z => ({ name: z.displayName, values: z.values })));

      return {
        normalityTests,
        allNormal,
        twoGroup: null,
        multiGroup: { anova, kw, tukey },
      };
    }
  }, [pooledZones]);

  const unit = PROPERTY_CONFIGS.find(c => c.key === selectedProperty)?.unit || '';

  if (groupSessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4" style={FONT_STYLE}>
        No samples in this group.
      </p>
    );
  }

  if (pooledZones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4" style={FONT_STYLE}>
        No zones defined in the samples of this group.
      </p>
    );
  }

  if (pooledZones.length === 1) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4" style={FONT_STYLE}>
        Only one zone type found. Define multiple zones to enable comparison.
      </p>
    );
  }

  return (
    <div className="space-y-4" style={FONT_STYLE}>
      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono">
          {pooledZones.length} zone types
        </Badge>
        <Badge variant="outline" className="font-mono">
          {groupSessions.length} samples
        </Badge>
        <Badge variant="outline" className="font-mono">
          {pooledZones.reduce((sum, z) => sum + z.stats.n, 0)} total points
        </Badge>
      </div>

      {/* Box/Violin Plot */}
      <BoxViolinPlots
        data={boxPlotData}
        selectedProperty={selectedProperty}
        showViolin={showViolin}
        showJitter={showJitter}
        showPValueAsterisks={true}
      />

      {/* Statistics Table */}
      <div className="border border-border rounded overflow-hidden">
        <div className="bg-muted/30 px-3 py-2 border-b border-border">
          <h6 className="font-mono text-xs font-bold uppercase">
            Pooled Zone Statistics {unit && `(${unit})`}
          </h6>
        </div>
        <ScrollArea className="h-48">
          <table className="w-full text-xs" style={FONT_STYLE}>
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left p-2 font-mono font-bold">Zone</th>
                <th className="text-right p-2 font-mono font-bold">N</th>
                <th className="text-right p-2 font-mono font-bold">Samples</th>
                <th className="text-right p-2 font-mono font-bold">Mean</th>
                <th className="text-right p-2 font-mono font-bold">SD</th>
                <th className="text-right p-2 font-mono font-bold">Median</th>
                <th className="text-right p-2 font-mono font-bold">IQR</th>
              </tr>
            </thead>
            <tbody>
              {pooledZones.map((zone, idx) => (
                <tr key={zone.name} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <td className="p-2 font-medium">{zone.displayName}</td>
                  <td className="text-right p-2 font-mono">{zone.stats.n}</td>
                  <td className="text-right p-2 font-mono">{zone.sampleCount}</td>
                  <td className="text-right p-2 font-mono">{formatValue(zone.stats.mean)}</td>
                  <td className="text-right p-2 font-mono">{formatValue(zone.stats.sd)}</td>
                  <td className="text-right p-2 font-mono">{formatValue(zone.stats.median)}</td>
                  <td className="text-right p-2 font-mono">{formatValue(zone.stats.iqr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Statistical Tests */}
      {statisticalTests && (
        <div className="border border-border rounded overflow-hidden">
          <div className="bg-muted/30 px-3 py-2 border-b border-border">
            <h6 className="font-mono text-xs font-bold uppercase">Statistical Tests</h6>
          </div>
          <div className="p-3 space-y-3 text-xs" style={FONT_STYLE}>
            {/* Normality */}
            <div>
              <p className="font-bold text-muted-foreground mb-1">Normality (Shapiro-Wilk)</p>
              <div className="flex flex-wrap gap-2">
                {statisticalTests.normalityTests.map(t => (
                  <Badge
                    key={t.name}
                    variant={t.isNormal ? 'outline' : 'secondary'}
                    className="font-mono text-xs"
                  >
                    {t.name}: W={t.shapiroWilk.statistic.toFixed(3)}, p={formatP(t.shapiroWilk.pValue)}
                    {t.isNormal ? ' ✓' : ' ✗'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Two-group tests */}
            {statisticalTests.twoGroup && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">Welch's t-test</p>
                    <p className="font-mono">
                      t({statisticalTests.twoGroup.welch.df.toFixed(1)}) = {statisticalTests.twoGroup.welch.statistic.toFixed(3)},
                      p = {formatP(statisticalTests.twoGroup.welch.pValue)}
                      {statisticalTests.twoGroup.welch.isSignificant && (
                        <Badge variant="destructive" className="ml-2 text-xs">Significant</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">Mann-Whitney U</p>
                    <p className="font-mono">
                      U = {statisticalTests.twoGroup.mannWhitney.uStatistic.toFixed(1)},
                      z = {statisticalTests.twoGroup.mannWhitney.zScore.toFixed(3)},
                      p = {formatP(statisticalTests.twoGroup.mannWhitney.pValue)}
                      {statisticalTests.twoGroup.mannWhitney.isSignificant && (
                        <Badge variant="destructive" className="ml-2 text-xs">Significant</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground mb-1">Effect Size</p>
                  <p className="font-mono">
                    Cohen's d = {statisticalTests.twoGroup.effectSize.cohensD.toFixed(3)},
                    Hedges' g = {statisticalTests.twoGroup.effectSize.hedgesG.toFixed(3)}
                    <Badge variant="outline" className="ml-2 text-xs capitalize">
                      {statisticalTests.twoGroup.effectSize.interpretation}
                    </Badge>
                  </p>
                </div>
              </div>
            )}

            {/* Multi-group tests */}
            {statisticalTests.multiGroup && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">One-way ANOVA</p>
                    <p className="font-mono">
                      F({statisticalTests.multiGroup.anova.dfBetween}, {statisticalTests.multiGroup.anova.dfWithin}) = {statisticalTests.multiGroup.anova.fStatistic.toFixed(3)},
                      p = {formatP(statisticalTests.multiGroup.anova.pValue)}
                      {statisticalTests.multiGroup.anova.isSignificant && (
                        <Badge variant="destructive" className="ml-2 text-xs">Significant</Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      η² = {statisticalTests.multiGroup.anova.etaSquared.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">Kruskal-Wallis H</p>
                    <p className="font-mono">
                      H({statisticalTests.multiGroup.kw.df}) = {statisticalTests.multiGroup.kw.hStatistic.toFixed(3)},
                      p = {formatP(statisticalTests.multiGroup.kw.pValue)}
                      {statisticalTests.multiGroup.kw.isSignificant && (
                        <Badge variant="destructive" className="ml-2 text-xs">Significant</Badge>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tukey HSD */}
                {statisticalTests.multiGroup.anova.isSignificant && statisticalTests.multiGroup.tukey.length > 0 && (
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">Tukey HSD Post-hoc</p>
                    <ScrollArea className="h-24">
                      <div className="space-y-1">
                        {statisticalTests.multiGroup.tukey.map((t, i) => (
                          <div key={i} className="font-mono flex items-center gap-2">
                            <span>{t.group1} vs {t.group2}:</span>
                            <span>Δ = {formatValue(t.meanDiff)}</span>
                            <span>p = {formatP(t.pValue)}</span>
                            {t.isSignificant && (
                              <Badge variant="destructive" className="text-xs">*</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
