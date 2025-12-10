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
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

const calculateGroupStats = (values: number[]): GroupStats | null => {
  if (values.length === 0) return null;
  
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const sem = std / Math.sqrt(n);
  const t95 = n > 30 ? 1.96 : 2.0;
  
  // Quartiles
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const medianIdx = Math.floor(n * 0.5);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  const median = sorted[medianIdx];
  const iqr = q3 - q1;
  
  // Whiskers (1.5 * IQR)
  const whiskerLow = Math.max(sorted[0], q1 - 1.5 * iqr);
  const whiskerHigh = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
  
  // Outliers
  const outliers = sorted.filter(v => v < whiskerLow || v > whiskerHigh);
  
  return {
    n,
    mean,
    std,
    sem,
    ci95Lower: mean - t95 * sem,
    ci95Upper: mean + t95 * sem,
    median,
    q1,
    q3,
    iqr,
    min: sorted[0],
    max: sorted[n - 1],
    whiskerLow,
    whiskerHigh,
    outliers,
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

  if (!stats.all) return null;

  // Calculate scale for visualization (include outliers)
  const allStats = hasSelection ? [stats.selected!, stats.unselected!] : [stats.all];
  const vizMin = Math.min(...allStats.map(s => Math.min(s.whiskerLow, ...s.outliers))) * 0.98;
  const vizMax = Math.max(...allStats.map(s => Math.max(s.whiskerHigh, ...s.outliers))) * 1.02;
  const vizRange = vizMax - vizMin || 1;

  const getPosition = (value: number) => ((value - vizMin) / vizRange) * 100;

  const unit = getPropertyUnit(selectedProperty);
  const label = getPropertyLabel(selectedProperty);

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground mb-1">
          {label} Comparison
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          Box plot with 95% CI
        </p>
      </div>

      {/* Box Plots */}
      <div className="space-y-3">
        {!hasSelection && stats.all && (
          <BoxPlot
            label="All"
            stats={stats.all}
            color="hsl(var(--muted-foreground))"
            getPosition={getPosition}
            formatValue={formatValue}
            unit={unit}
          />
        )}

        {hasSelection && stats.selected && stats.unselected && (
          <>
            <BoxPlot
              label="Selected"
              stats={stats.selected}
              color="hsl(var(--primary))"
              getPosition={getPosition}
              formatValue={formatValue}
              unit={unit}
            />
            <BoxPlot
              label="Unselected"
              stats={stats.unselected}
              color="hsl(var(--muted-foreground))"
              getPosition={getPosition}
              formatValue={formatValue}
              unit={unit}
            />
            
            <div className="pt-3 border-t border-border">
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
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>{formatValue(vizMin)}</span>
        <span>{unit}</span>
        <span>{formatValue(vizMax)}</span>
      </div>
    </div>
  );
};

interface BoxPlotProps {
  label: string;
  stats: GroupStats;
  color: string;
  getPosition: (value: number) => number;
  formatValue: (val: number) => string;
  unit: string;
}

const BoxPlot: React.FC<BoxPlotProps> = ({
  label,
  stats,
  color,
  getPosition,
  formatValue,
  unit,
}) => {
  const q1Pos = getPosition(stats.q1);
  const q3Pos = getPosition(stats.q3);
  const medianPos = getPosition(stats.median);
  const meanPos = getPosition(stats.mean);
  const whiskerLowPos = getPosition(stats.whiskerLow);
  const whiskerHighPos = getPosition(stats.whiskerHigh);
  const ciLowerPos = getPosition(stats.ci95Lower);
  const ciUpperPos = getPosition(stats.ci95Upper);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {label} (n={stats.n})
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          μ={formatValue(stats.mean)} {unit}
        </span>
      </div>
      
      {/* Box plot visualization */}
      <div className="relative h-10 bg-muted/20 rounded">
        {/* 95% CI background */}
        <div
          className="absolute h-full rounded opacity-20"
          style={{
            left: `${ciLowerPos}%`,
            width: `${ciUpperPos - ciLowerPos}%`,
            backgroundColor: color,
          }}
        />
        
        {/* Whisker line */}
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2"
          style={{
            left: `${whiskerLowPos}%`,
            width: `${whiskerHighPos - whiskerLowPos}%`,
            backgroundColor: color,
            opacity: 0.6,
          }}
        />
        
        {/* Whisker caps */}
        <div
          className="absolute top-2 bottom-2 w-0.5"
          style={{ left: `${whiskerLowPos}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-2 bottom-2 w-0.5"
          style={{ left: `${whiskerHighPos}%`, backgroundColor: color }}
        />
        
        {/* IQR Box (Q1-Q3) */}
        <div
          className="absolute top-1 bottom-1 rounded border-2"
          style={{
            left: `${q1Pos}%`,
            width: `${q3Pos - q1Pos}%`,
            backgroundColor: `${color}33`,
            borderColor: color,
          }}
        />
        
        {/* Median line */}
        <div
          className="absolute top-1 bottom-1 w-0.5"
          style={{ left: `${medianPos}%`, backgroundColor: color }}
        />
        
        {/* Mean diamond */}
        <div
          className="absolute top-1/2 w-2.5 h-2.5"
          style={{
            left: `${meanPos}%`,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            backgroundColor: color,
            border: '1.5px solid hsl(var(--card))',
          }}
        />
        
        {/* Outliers */}
        {stats.outliers.slice(0, 10).map((val, i) => (
          <div
            key={i}
            className="absolute top-1/2 w-1.5 h-1.5 rounded-full -translate-y-1/2"
            style={{
              left: `${getPosition(val)}%`,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1 font-mono text-xs text-muted-foreground">
        <span>Q1: {formatValue(stats.q1)}</span>
        <span>Med: {formatValue(stats.median)}</span>
        <span>Q3: {formatValue(stats.q3)}</span>
        <span>IQR: {formatValue(stats.iqr)}</span>
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>95% CI: [{formatValue(stats.ci95Lower)}, {formatValue(stats.ci95Upper)}]</span>
        {stats.outliers.length > 0 && (
          <span className="text-destructive">{stats.outliers.length} outliers</span>
        )}
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
  const seDiff = Math.sqrt(Math.pow(selected.sem, 2) + Math.pow(unselected.sem, 2));
  const tStat = Math.abs(diff / seDiff);
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
          <span className="text-muted-foreground">p-value:</span>
          <span className={`ml-1 font-bold ${isSignificant ? 'text-primary' : ''}`}>
            {pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}
            {isSignificant ? ' *' : ''}
          </span>
        </div>
      </div>
      
      {isSignificant && (
        <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
          Statistically significant (p &lt; 0.05)
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