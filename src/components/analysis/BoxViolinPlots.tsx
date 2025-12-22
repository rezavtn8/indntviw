import React, { useMemo } from 'react';
import { DescriptiveStats, welchTTest, oneWayANOVA } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';

interface BoxViolinPlotsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
  showPValueAsterisks?: boolean;
}

// Get p-value significance asterisks
const getPValueAsterisks = (pValue: number): string => {
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
};

export const BoxViolinPlots: React.FC<BoxViolinPlotsProps> = ({
  data,
  selectedProperty,
  showViolin = false,
  showJitter = true,
  showPValueAsterisks = false,
}) => {
  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  // Calculate global min/max for consistent scaling
  const { globalMin, globalMax, range } = useMemo(() => {
    const allValues = data.flatMap(d => d.values);
    if (allValues.length === 0) return { globalMin: 0, globalMax: 100, range: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.15; // Extra padding for asterisks
    return { globalMin: min - padding, globalMax: max + padding, range: max - min + 2 * padding };
  }, [data]);

  const valueToY = (value: number): number => {
    return ((globalMax - value) / range) * 200;
  };

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    if (Math.abs(val) >= 1) return val.toFixed(2);
    return val.toFixed(4);
  };

  // Calculate pairwise p-values for asterisks
  const pairwiseResults = useMemo(() => {
    if (!showPValueAsterisks || data.length < 2) return [];
    
    const results: { i: number; j: number; pValue: number; asterisks: string }[] = [];
    
    // For 2 groups, just show one comparison
    if (data.length === 2) {
      const test = welchTTest(data[0].values, data[1].values);
      results.push({ i: 0, j: 1, pValue: test.pValue, asterisks: getPValueAsterisks(test.pValue) });
    } else {
      // For multiple groups, first check ANOVA significance
      const groups = data.map(d => d.values);
      const anova = oneWayANOVA(groups);
      
      if (anova.isSignificant) {
        // Show pairwise comparisons (limit to adjacent pairs to avoid clutter)
        for (let i = 0; i < data.length - 1; i++) {
          const test = welchTTest(data[i].values, data[i + 1].values);
          results.push({ i, j: i + 1, pValue: test.pValue, asterisks: getPValueAsterisks(test.pValue) });
        }
      }
    }
    
    return results;
  }, [data, showPValueAsterisks]);

  // Generate violin path (kernel density estimation)
  const getViolinPath = (values: number[], centerX: number, width: number): string => {
    if (values.length < 2) return '';
    
    const sorted = [...values].sort((a, b) => a - b);
    const bandwidth = (sorted[sorted.length - 1] - sorted[0]) / 10 || 1;
    const steps = 30;
    
    const densities: { y: number; density: number }[] = [];
    let maxDensity = 0;
    
    for (let i = 0; i <= steps; i++) {
      const value = globalMin + (i / steps) * range;
      let density = 0;
      for (const v of values) {
        const u = (value - v) / bandwidth;
        density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }
      density /= values.length * bandwidth;
      maxDensity = Math.max(maxDensity, density);
      densities.push({ y: valueToY(value), density });
    }
    
    if (maxDensity === 0) return '';
    
    // Create symmetric violin shape
    const leftPath = densities.map((d, i) => {
      const x = centerX - (d.density / maxDensity) * (width / 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${d.y}`;
    }).join(' ');
    
    const rightPath = [...densities].reverse().map(d => {
      const x = centerX + (d.density / maxDensity) * (width / 2);
      return `L ${x} ${d.y}`;
    }).join(' ');
    
    return `${leftPath} ${rightPath} Z`;
  };

  // Seeded pseudo-random for consistent jitter positions
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Generate jittered points with stable positions
  const getJitteredPoints = useMemo(() => (values: number[], centerX: number, width: number, groupIndex: number): { x: number; y: number }[] => {
    const maxJitter = width * 0.3;
    return values.slice(0, 100).map((v, i) => ({
      x: centerX + (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
      y: valueToY(v),
    }));
  }, [globalMin, range]);

  const boxWidth = 40;
  const groupWidth = 80;
  const svgWidth = Math.max(400, data.length * groupWidth + 80);
  const svgHeight = showPValueAsterisks && pairwiseResults.length > 0 ? 360 : 320;

  return (
    <div className="border-2 border-border rounded-lg p-4">
      <div className="mb-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
          Box Plot Comparison
          {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
        </h4>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Y-axis */}
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const value = globalMin + frac * range;
              const y = valueToY(value);
              return (
                <g key={frac}>
                  <line x1={50} y1={y + 20} x2={svgWidth - 20} y2={y + 20} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={45} y={y + 24} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '11px' }}>
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* P-value brackets and asterisks */}
          {showPValueAsterisks && pairwiseResults.map((result, idx) => {
            const centerX1 = 80 + result.i * groupWidth + groupWidth / 2;
            const centerX2 = 80 + result.j * groupWidth + groupWidth / 2;
            const bracketY = 8 - idx * 18; // Stack multiple brackets
            const midX = (centerX1 + centerX2) / 2;
            
            return (
              <g key={`bracket-${idx}`} transform="translate(0, 20)">
                {/* Bracket lines */}
                <line x1={centerX1} y1={bracketY + 6} x2={centerX1} y2={bracketY} stroke="currentColor" strokeWidth={1} />
                <line x1={centerX1} y1={bracketY} x2={centerX2} y2={bracketY} stroke="currentColor" strokeWidth={1} />
                <line x1={centerX2} y1={bracketY} x2={centerX2} y2={bracketY + 6} stroke="currentColor" strokeWidth={1} />
                
                {/* Asterisks or ns */}
                <text 
                  x={midX} 
                  y={bracketY - 3} 
                  textAnchor="middle" 
                  className="fill-foreground"
                  style={{ 
                    fontSize: result.asterisks === 'ns' ? '9px' : '14px', 
                    fontWeight: 'bold',
                    fontStyle: result.asterisks === 'ns' ? 'italic' : 'normal'
                  }}
                >
                  {result.asterisks}
                </text>
              </g>
            );
          })}

          {/* Box plots */}
          {data.map((d, idx) => {
            const centerX = 80 + idx * groupWidth + groupWidth / 2;
            const { stats, values, color, name } = d;
            
            if (values.length === 0) return null;

            const q1Y = valueToY(stats.q1);
            const q3Y = valueToY(stats.q3);
            const medianY = valueToY(stats.median);
            const meanY = valueToY(stats.mean);
            const whiskerLow = valueToY(Math.max(stats.min, stats.q1 - 1.5 * stats.iqr));
            const whiskerHigh = valueToY(Math.min(stats.max, stats.q3 + 1.5 * stats.iqr));

            return (
              <g key={name} transform="translate(0, 20)">
                {/* Violin (if enabled) */}
                {showViolin && (
                  <path
                    d={getViolinPath(values, centerX, boxWidth * 1.5)}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeOpacity={0.3}
                  />
                )}

                {/* Jittered points (if enabled) */}
                {showJitter && getJitteredPoints(values, centerX, boxWidth, idx).map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={2}
                    fill={color}
                    fillOpacity={0.4}
                  />
                ))}

                {/* Whiskers */}
                <line x1={centerX} y1={whiskerHigh} x2={centerX} y2={q3Y} stroke={color} strokeWidth={1.5} />
                <line x1={centerX} y1={q1Y} x2={centerX} y2={whiskerLow} stroke={color} strokeWidth={1.5} />
                <line x1={centerX - 10} y1={whiskerHigh} x2={centerX + 10} y2={whiskerHigh} stroke={color} strokeWidth={1.5} />
                <line x1={centerX - 10} y1={whiskerLow} x2={centerX + 10} y2={whiskerLow} stroke={color} strokeWidth={1.5} />

                {/* Box */}
                <rect
                  x={centerX - boxWidth / 2}
                  y={q3Y}
                  width={boxWidth}
                  height={q1Y - q3Y}
                  fill={color}
                  fillOpacity={0.3}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Median line */}
                <line
                  x1={centerX - boxWidth / 2}
                  y1={medianY}
                  x2={centerX + boxWidth / 2}
                  y2={medianY}
                  stroke={color}
                  strokeWidth={3}
                />

                {/* Mean diamond */}
                <polygon
                  points={`${centerX},${meanY - 4} ${centerX + 4},${meanY} ${centerX},${meanY + 4} ${centerX - 4},${meanY}`}
                  fill="hsl(var(--background))"
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Label */}
                <text
                  x={centerX}
                  y={240}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, 240)`}
                  className="fill-foreground"
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                >
                  {name}
                </text>
                <text
                  x={centerX}
                  y={260}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, 260)`}
                  className="fill-muted-foreground"
                  style={{ fontSize: '10px' }}
                >
                  n={stats.n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-foreground" />
          <span>Median</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-foreground rotate-45" />
          <span>Mean</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-3 bg-foreground/20 border border-foreground" />
          <span>IQR</span>
        </div>
        {showPValueAsterisks && (
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="font-bold">*</span>
            <span>p&lt;0.05</span>
            <span className="font-bold">**</span>
            <span>p&lt;0.01</span>
            <span className="font-bold">***</span>
            <span>p&lt;0.001</span>
          </div>
        )}
      </div>
    </div>
  );
};
