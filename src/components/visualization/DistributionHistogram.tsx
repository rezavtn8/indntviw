import React, { useMemo } from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';

interface GroupComparisonProps {
  allPoints: IndentationPoint[];
  selectedPoints: IndentationPoint[];
  selectedProperty: string;
}

interface GroupStats {
  n: number;
  mean: number;
  std: number;
  sem: number;
  ci95Lower: number;
  ci95Upper: number;
  median: number;
  min: number;
  max: number;
}

const calculateGroupStats = (values: number[]): GroupStats | null => {
  if (values.length === 0) return null;
  
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const sem = std / Math.sqrt(n);
  const t95 = n > 30 ? 1.96 : 2.0; // Approximate t-value for 95% CI
  
  return {
    n,
    mean,
    std,
    sem,
    ci95Lower: mean - t95 * sem,
    ci95Upper: mean + t95 * sem,
    median: sorted[Math.floor(n / 2)],
    min: sorted[0],
    max: sorted[n - 1],
  };
};

export const DistributionHistogram: React.FC<GroupComparisonProps> = ({
  allPoints,
  selectedPoints,
  selectedProperty,
}) => {
  const stats = useMemo(() => {
    const allValues = allPoints
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    const selectedValues = selectedPoints
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    // "Unselected" = All - Selected
    const selectedIds = new Set(selectedPoints.map(p => p.id));
    const unselectedValues = allPoints
      .filter(p => !selectedIds.has(p.id))
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    return {
      all: calculateGroupStats(allValues),
      selected: calculateGroupStats(selectedValues),
      unselected: calculateGroupStats(unselectedValues),
    };
  }, [allPoints, selectedPoints, selectedProperty]);

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

  const hasSelection = selectedPoints.length > 0 && stats.selected && stats.unselected;

  if (!stats.all) {
    return null;
  }

  // Calculate scale for visualization
  const allMin = stats.all.ci95Lower;
  const allMax = stats.all.ci95Upper;
  const selectedMin = stats.selected?.ci95Lower ?? allMin;
  const selectedMax = stats.selected?.ci95Upper ?? allMax;
  const unselectedMin = stats.unselected?.ci95Lower ?? allMin;
  const unselectedMax = stats.unselected?.ci95Upper ?? allMax;
  
  const vizMin = Math.min(allMin, selectedMin, unselectedMin) * 0.95;
  const vizMax = Math.max(allMax, selectedMax, unselectedMax) * 1.05;
  const vizRange = vizMax - vizMin || 1;

  const getPosition = (value: number) => ((value - vizMin) / vizRange) * 100;

  const unit = getPropertyUnit(selectedProperty);
  const label = getPropertyLabel(selectedProperty);

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm">
      <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground mb-1">
        {label} Comparison
      </h3>
      <p className="font-mono text-xs text-muted-foreground mb-4">
        Mean with 95% Confidence Interval
      </p>

      <div className="space-y-4">
        {/* All Points (only show when no selection) */}
        {!hasSelection && stats.all && (
          <GroupBar
            label="All"
            stats={stats.all}
            color="hsl(var(--muted-foreground))"
            getPosition={getPosition}
            formatValue={formatValue}
            unit={unit}
          />
        )}

        {/* Selected vs Unselected comparison */}
        {hasSelection && stats.selected && stats.unselected && (
          <>
            <GroupBar
              label="Selected"
              stats={stats.selected}
              color="hsl(var(--primary))"
              getPosition={getPosition}
              formatValue={formatValue}
              unit={unit}
            />
            <GroupBar
              label="Unselected"
              stats={stats.unselected}
              color="hsl(var(--muted-foreground))"
              getPosition={getPosition}
              formatValue={formatValue}
              unit={unit}
            />
            
            {/* Statistical comparison */}
            <div className="mt-4 pt-3 border-t border-border">
              <StatComparison
                selected={stats.selected}
                unselected={stats.unselected}
                formatValue={formatValue}
                unit={unit}
              />
            </div>
          </>
        )}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-3 font-mono text-xs text-muted-foreground">
        <span>{formatValue(vizMin)}</span>
        <span>{unit}</span>
        <span>{formatValue(vizMax)}</span>
      </div>
    </div>
  );
};

interface GroupBarProps {
  label: string;
  stats: GroupStats;
  color: string;
  getPosition: (value: number) => number;
  formatValue: (val: number) => string;
  unit: string;
}

const GroupBar: React.FC<GroupBarProps> = ({
  label,
  stats,
  color,
  getPosition,
  formatValue,
  unit,
}) => {
  const meanPos = getPosition(stats.mean);
  const ciLowerPos = getPosition(stats.ci95Lower);
  const ciUpperPos = getPosition(stats.ci95Upper);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {label} (n={stats.n})
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatValue(stats.mean)} ± {formatValue(stats.sem)} {unit}
        </span>
      </div>
      
      {/* Visual bar with CI */}
      <div className="relative h-8 bg-muted/30 rounded">
        {/* 95% CI range */}
        <div
          className="absolute h-full rounded opacity-40"
          style={{
            left: `${ciLowerPos}%`,
            width: `${ciUpperPos - ciLowerPos}%`,
            backgroundColor: color,
          }}
        />
        
        {/* CI whiskers */}
        <div
          className="absolute top-1 bottom-1 w-0.5"
          style={{ left: `${ciLowerPos}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-1 bottom-1 w-0.5"
          style={{ left: `${ciUpperPos}%`, backgroundColor: color }}
        />
        
        {/* Mean marker */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded"
          style={{ left: `${meanPos}%`, backgroundColor: color, transform: 'translateX(-50%)' }}
        />
        
        {/* Mean diamond */}
        <div
          className="absolute top-1/2 w-3 h-3 rotate-45"
          style={{
            left: `${meanPos}%`,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            backgroundColor: color,
            border: '2px solid hsl(var(--card))',
          }}
        />
      </div>
      
      {/* Stats summary */}
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>CI: [{formatValue(stats.ci95Lower)}, {formatValue(stats.ci95Upper)}]</span>
        <span>SD: {formatValue(stats.std)}</span>
      </div>
    </div>
  );
};

interface StatComparisonProps {
  selected: GroupStats;
  unselected: GroupStats;
  formatValue: (val: number) => string;
  unit: string;
}

const StatComparison: React.FC<StatComparisonProps> = ({
  selected,
  unselected,
  formatValue,
  unit,
}) => {
  const diff = selected.mean - unselected.mean;
  const percentDiff = (diff / unselected.mean) * 100;
  
  // Pooled standard error for difference
  const seDiff = Math.sqrt(
    Math.pow(selected.sem, 2) + Math.pow(unselected.sem, 2)
  );
  
  // T-statistic
  const tStat = Math.abs(diff / seDiff);
  
  // Approximate p-value (for large n, t ~ z)
  const pValue = 2 * (1 - normalCDF(tStat));
  
  const isSignificant = pValue < 0.05;

  return (
    <div className="space-y-2">
      <div className="font-mono text-xs font-bold text-foreground">
        Difference Analysis
      </div>
      
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div>
          <span className="text-muted-foreground">Δ Mean:</span>
          <span className={`ml-1 font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : ''}`}>
            {diff > 0 ? '+' : ''}{formatValue(diff)} {unit}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">% Change:</span>
          <span className={`ml-1 font-bold ${percentDiff > 0 ? 'text-green-500' : percentDiff < 0 ? 'text-red-500' : ''}`}>
            {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">t-statistic:</span>
          <span className="ml-1">{tStat.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">p-value:</span>
          <span className={`ml-1 font-bold ${isSignificant ? 'text-primary' : ''}`}>
            {pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}
            {isSignificant ? ' *' : ''}
          </span>
        </div>
      </div>
      
      {isSignificant && (
        <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
          Statistically significant difference (p &lt; 0.05)
        </div>
      )}
    </div>
  );
};

// Standard normal CDF approximation
const normalCDF = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
};