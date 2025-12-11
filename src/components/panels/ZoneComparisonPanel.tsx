import React, { useMemo } from 'react';
import { Zone } from '@/types/zones';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { getPointsInZone, calculateZoneStatistics } from '@/utils/zoneUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ZoneComparisonPanelProps {
  zones: Zone[];
  points: IndentationPoint[];
  selectedProperty: string;
  comparedZoneIds: string[];
  onToggleCompare: (zoneId: string) => void;
}

interface ZoneStats {
  zone: Zone;
  n: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
}

const calculateFullStats = (values: number[]): { mean: number; std: number; min: number; max: number; median: number } => {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const median = sorted[Math.floor(n / 2)];
  
  return { mean, std, min: sorted[0], max: sorted[n - 1], median };
};

export const ZoneComparisonPanel: React.FC<ZoneComparisonPanelProps> = ({
  zones,
  points,
  selectedProperty,
  comparedZoneIds,
  onToggleCompare,
}) => {
  const zoneStats = useMemo(() => {
    return zones.map(zone => {
      const zonePoints = getPointsInZone(points, zone);
      const values = zonePoints
        .map(p => p.properties[selectedProperty])
        .filter(v => v !== undefined && !isNaN(v));
      
      const stats = calculateFullStats(values);
      
      return {
        zone,
        n: zonePoints.length,
        ...stats,
      };
    });
  }, [zones, points, selectedProperty]);

  const comparedStats = useMemo(() => {
    return zoneStats.filter(s => comparedZoneIds.includes(s.zone.id));
  }, [zoneStats, comparedZoneIds]);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const formatValue = (val: number): string => {
    if (val >= 1000) return val.toFixed(0);
    if (val >= 1) return val.toFixed(2);
    return val.toFixed(4);
  };

  // Calculate comparison between zones
  const comparison = useMemo(() => {
    if (comparedStats.length < 2) return null;
    
    const [zone1, zone2] = comparedStats;
    const diff = zone1.mean - zone2.mean;
    const percentDiff = zone2.mean !== 0 ? (diff / zone2.mean) * 100 : 0;
    
    // Simple t-test
    const se1 = zone1.std / Math.sqrt(zone1.n);
    const se2 = zone2.std / Math.sqrt(zone2.n);
    const seDiff = Math.sqrt(se1 * se1 + se2 * se2);
    const tStat = seDiff > 0 ? Math.abs(diff / seDiff) : 0;
    
    // Approximate p-value
    const pValue = 2 * (1 - normalCDF(tStat));
    
    return {
      zone1Name: zone1.zone.name,
      zone2Name: zone2.zone.name,
      diff,
      percentDiff,
      pValue,
      isSignificant: pValue < 0.05,
    };
  }, [comparedStats]);

  const unit = getPropertyUnit(selectedProperty);

  if (zones.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm font-mono">
          Create zones to compare regions.
        </p>
      </div>
    );
  }

  // Find max mean for bar chart scaling
  const maxMean = Math.max(...zoneStats.map(s => s.mean), 0.001);

  return (
    <div className="space-y-4">
      {/* Zone Selection */}
      <div className="space-y-2">
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Select Zones to Compare
        </h4>
        <div className="space-y-1">
          {zones.map(zone => {
            const isCompared = comparedZoneIds.includes(zone.id);
            return (
              <label
                key={zone.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                  isCompared ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={isCompared}
                  onCheckedChange={() => onToggleCompare(zone.id)}
                />
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="font-mono text-sm flex-1 truncate">{zone.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Comparison Table */}
      {comparedStats.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {getPropertyLabel(selectedProperty)} Comparison
          </h4>

          <ScrollArea className="max-h-[250px]">
            <div className="space-y-3">
              {comparedStats.map((stats, idx) => (
                <div
                  key={stats.zone.id}
                  className="p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: stats.zone.color }}
                    />
                    <span className="font-mono text-sm font-bold">{stats.zone.name}</span>
                    <span className="font-mono text-xs text-muted-foreground ml-auto">
                      n={stats.n}
                    </span>
                  </div>

                  {/* Bar visualization */}
                  <div className="relative h-5 bg-muted rounded mb-2">
                    <div
                      className="absolute top-0 left-0 h-full rounded transition-all duration-300"
                      style={{
                        width: `${(stats.mean / maxMean) * 100}%`,
                        backgroundColor: stats.zone.color,
                        opacity: 0.7,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold">
                      {formatValue(stats.mean)} {unit}
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-1 font-mono text-xs text-muted-foreground">
                    <div>
                      <span className="block text-foreground">{formatValue(stats.min)}</span>
                      <span>Min</span>
                    </div>
                    <div>
                      <span className="block text-foreground">{formatValue(stats.median)}</span>
                      <span>Med</span>
                    </div>
                    <div>
                      <span className="block text-foreground">{formatValue(stats.max)}</span>
                      <span>Max</span>
                    </div>
                    <div>
                      <span className="block text-foreground">±{formatValue(stats.std)}</span>
                      <span>Std</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Statistical Comparison */}
          {comparison && (
            <div className="p-3 bg-card border-2 border-border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                {comparison.diff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : comparison.diff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-mono text-sm font-bold">
                  {comparison.zone1Name} vs {comparison.zone2Name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground">Δ Mean:</span>
                  <span className={`ml-1 font-bold ${
                    comparison.diff > 0 ? 'text-green-500' : comparison.diff < 0 ? 'text-red-500' : ''
                  }`}>
                    {comparison.diff > 0 ? '+' : ''}{formatValue(comparison.diff)} {unit}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">% Diff:</span>
                  <span className={`ml-1 font-bold ${
                    comparison.percentDiff > 0 ? 'text-green-500' : comparison.percentDiff < 0 ? 'text-red-500' : ''
                  }`}>
                    {comparison.percentDiff > 0 ? '+' : ''}{comparison.percentDiff.toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">p-value:</span>
                  <span className={`ml-1 font-bold ${comparison.isSignificant ? 'text-primary' : ''}`}>
                    {comparison.pValue < 0.001 ? '<0.001' : comparison.pValue.toFixed(3)}
                    {comparison.isSignificant && ' *'}
                  </span>
                </div>
              </div>

              {comparison.isSignificant && (
                <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded text-center">
                  Statistically significant difference (p &lt; 0.05)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const normalCDF = (x: number): number => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
};
