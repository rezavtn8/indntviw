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
  getPropertyValues,
} from '@/utils/advancedStatistics';
import { getPointsInZone } from '@/utils/zoneUtils';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { BoxViolinPlots } from './BoxViolinPlots';
import { ComparisonReport } from './ComparisonReport';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IntraGroupZoneComparisonProps {
  groupSessions: FileSession[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
  blendOverlap?: boolean;
  smallDots?: boolean;
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
  blendOverlap = false,
  smallDots = false,
}) => {
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
        blendOverlap={blendOverlap}
        smallDots={smallDots}
        showPValueAsterisks={true}
        xAxisLabel="Zones (pooled within Group)"
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

      <ComparisonReport
        groups={pooledZones.map((z, i) => ({ name: z.displayName, values: z.values, color: ZONE_COLORS[i % ZONE_COLORS.length] }))}
        title="Zone Tests Within Group"
        unit="indents"
        compact
      />
    </div>
  );
};
