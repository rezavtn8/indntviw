import React, { useMemo } from 'react';
import { DescriptiveStats, welchTTest, oneWayANOVA } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';

interface BoxViolinPlotsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
  showPValueAsterisks?: boolean;
  isExport?: boolean;
  blackAndWhite?: boolean;
}

// B&W patterns for grayscale printing
const BW_STYLES = [
  { fill: '#000000', fillOpacity: 0.1, stroke: '#000000', pattern: 'none' },
  { fill: '#000000', fillOpacity: 0.3, stroke: '#000000', pattern: 'none' },
  { fill: '#000000', fillOpacity: 0.5, stroke: '#000000', pattern: 'none' },
  { fill: '#ffffff', fillOpacity: 1, stroke: '#000000', pattern: 'stripe' },
  { fill: '#ffffff', fillOpacity: 1, stroke: '#000000', pattern: 'dots' },
  { fill: '#000000', fillOpacity: 0.7, stroke: '#000000', pattern: 'none' },
];

// Get p-value significance asterisks
const getPValueAsterisks = (pValue: number): string => {
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
};

// Get B&W style for a given index
const getBWStyle = (idx: number) => BW_STYLES[idx % BW_STYLES.length];

export const BoxViolinPlots: React.FC<BoxViolinPlotsProps> = ({
  data,
  selectedProperty,
  showViolin = false,
  showJitter = true,
  showPValueAsterisks = false,
  isExport = false,
  blackAndWhite = false,
}) => {
  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  // Calculate pairwise p-values for asterisks (needed before topMargin calculation)
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

  // Calculate nice axis boundaries FIRST, then use for all scaling
  const { niceMin, niceMax, niceTicks } = useMemo(() => {
    const allValues = data.flatMap(d => d.values);
    if (allValues.length === 0) return { niceMin: 0, niceMax: 100, niceTicks: [0, 25, 50, 75, 100] };
    
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const padding = (rawMax - rawMin) * 0.15;
    const paddedMin = rawMin - padding;
    const paddedMax = rawMax + padding;
    
    // Calculate nice step
    const range = paddedMax - paddedMin;
    const targetCount = 5;
    const roughStep = range / (targetCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    
    let niceStep: number;
    if (residual <= 1.5) niceStep = magnitude;
    else if (residual <= 3) niceStep = 2 * magnitude;
    else if (residual <= 7) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;
    
    // Round min DOWN and max UP to nice values
    const computedNiceMin = Math.floor(paddedMin / niceStep) * niceStep;
    const computedNiceMax = Math.ceil(paddedMax / niceStep) * niceStep;
    
    // Generate ticks
    const ticks: number[] = [];
    for (let v = computedNiceMin; v <= computedNiceMax + niceStep * 0.001; v += niceStep) {
      ticks.push(Math.round(v / niceStep) * niceStep); // Avoid floating point issues
    }
    
    return { niceMin: computedNiceMin, niceMax: computedNiceMax, niceTicks: ticks.length > 0 ? ticks : [computedNiceMin, computedNiceMax] };
  }, [data]);

  const niceRange = niceMax - niceMin;

  // Bracket layout constants
  const bracketRowHeight = 24;
  const bracketTopPadding = 16;
  const bracketAreaHeight = showPValueAsterisks && pairwiseResults.length > 0 
    ? pairwiseResults.length * bracketRowHeight + bracketTopPadding 
    : 0;

  // Plot area dimensions
  const plotHeight = 200;
  const baseTopMargin = 20;
  const topMargin = baseTopMargin + bracketAreaHeight;

  const valueToY = (value: number): number => {
    return topMargin + ((niceMax - value) / niceRange) * plotHeight;
  };

  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    if (absVal >= 1000) return val.toFixed(0);
    if (absVal >= 100) return val.toFixed(1);
    if (absVal >= 10) return val.toFixed(1);
    if (absVal >= 1) return val.toFixed(2);
    if (absVal >= 0.01) return val.toFixed(3);
    return val.toExponential(1);
  };

  // Generate violin path (kernel density estimation)
  const getViolinPath = (values: number[], centerX: number, width: number): string => {
    if (values.length < 2) return '';
    
    const sorted = [...values].sort((a, b) => a - b);
    const bandwidth = (sorted[sorted.length - 1] - sorted[0]) / 10 || 1;
    const steps = 30;
    
    const densities: { y: number; density: number }[] = [];
    let maxDensity = 0;
    
    for (let i = 0; i <= steps; i++) {
      const value = niceMin + (i / steps) * niceRange;
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

  // Generate jittered points - computed inline to ensure consistent positioning
  const getJitteredPoints = (values: number[], centerX: number, jitterWidth: number, groupIndex: number): { x: number; y: number }[] => {
    const maxJitter = jitterWidth * 0.3;
    return values.slice(0, 100).map((v, i) => ({
      x: centerX + (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
      y: valueToY(v),
    }));
  };

  const boxWidth = 40;
  const groupWidth = 100;
  const leftPadding = 70;
  const rightPadding = 60; // Increased for violins
  const svgWidth = Math.max(450, data.length * groupWidth + leftPadding + rightPadding);
  const labelAreaHeight = 80; // Space for rotated labels
  const svgHeight = topMargin + plotHeight + labelAreaHeight;

  const fontStyle: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

  // Single source of truth for x-coordinate per group - ALL layers must use this
  const getCenterX = (idx: number): number => leftPadding + idx * groupWidth + groupWidth / 2;

  return (
    <div 
      className={isExport ? '' : 'border-2 border-border rounded-lg p-4'} 
      style={fontStyle}
    >
      {!isExport && (
        <div className="mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider" style={fontStyle}>
            Box Plot Comparison
            {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
          </h4>
        </div>
      )}

      <div className={isExport ? '' : 'overflow-x-auto'} style={isExport ? { width: svgWidth } : undefined}>
        <svg width={svgWidth} height={svgHeight} className="block" style={{ ...fontStyle, display: 'block' }}>
          {/* SVG Pattern definitions for B&W mode */}
          <defs>
            <pattern id="bw-stripe" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#000" strokeWidth="0.5"/>
            </pattern>
            <pattern id="bw-dots" patternUnits="userSpaceOnUse" width="4" height="4">
              <circle cx="2" cy="2" r="1" fill="#000"/>
            </pattern>
          </defs>
          {/* Y-axis with nice ticks */}
          <g>
            {niceTicks.map(value => {
              const y = valueToY(value);
              return (
                <g key={value}>
                  <line x1={50} y1={y} x2={svgWidth - 20} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={45} y={y + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '11px', ...fontStyle }}>
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* P-value brackets and asterisks - positioned in bracket area */}
          {showPValueAsterisks && pairwiseResults.map((result, idx) => {
            const centerX1 = getCenterX(result.i);
            const centerX2 = getCenterX(result.j);
            // Position brackets within the bracket area, from top down
            const bracketY = bracketTopPadding + idx * bracketRowHeight;
            const midX = (centerX1 + centerX2) / 2;
            
            return (
              <g key={`bracket-${idx}`}>
                {/* Bracket lines */}
                <line x1={centerX1} y1={bracketY + 10} x2={centerX1} y2={bracketY} stroke="currentColor" strokeWidth={1} />
                <line x1={centerX1} y1={bracketY} x2={centerX2} y2={bracketY} stroke="currentColor" strokeWidth={1} />
                <line x1={centerX2} y1={bracketY} x2={centerX2} y2={bracketY + 10} stroke="currentColor" strokeWidth={1} />
                
                {/* Asterisks or ns */}
                <text 
                  x={midX} 
                  y={bracketY - 4} 
                  textAnchor="middle" 
                  className="fill-foreground"
                  style={{ 
                    fontSize: result.asterisks === 'ns' ? '9px' : '14px', 
                    fontWeight: 'bold',
                    fontStyle: result.asterisks === 'ns' ? 'italic' : 'normal',
                    ...fontStyle
                  }}
                >
                  {result.asterisks}
                </text>
              </g>
            );
          })}

          {/* Box plots */}
          {data.map((d, idx) => {
            const centerX = getCenterX(idx);
            const { stats, values, color, name } = d;

            if (values.length === 0) return null;

            const q1Y = valueToY(stats.q1);
            const q3Y = valueToY(stats.q3);
            const medianY = valueToY(stats.median);
            const meanY = valueToY(stats.mean);
            const whiskerLow = valueToY(Math.max(stats.min, stats.q1 - 1.5 * stats.iqr));
            const whiskerHigh = valueToY(Math.min(stats.max, stats.q3 + 1.5 * stats.iqr));
            const labelY = topMargin + plotHeight + 25;

            // Get colors based on B&W mode
            const bwStyle = getBWStyle(idx);
            const boxFill = blackAndWhite
              ? (bwStyle.pattern === 'stripe'
                  ? 'url(#bw-stripe)'
                  : bwStyle.pattern === 'dots'
                    ? 'url(#bw-dots)'
                    : bwStyle.fill)
              : color;
            const boxFillOpacity = blackAndWhite ? bwStyle.fillOpacity : 0.3;
            const strokeColor = blackAndWhite ? '#000000' : color;
            const pointColor = blackAndWhite ? '#333333' : color;

            // IMPORTANT: Apply a single translate() transform per group so html2canvas
            // cannot introduce layer-specific x-offset rounding across primitives.
            return (
              <g key={name} transform={`translate(${centerX} 0)`}>
                {/* Violin (if enabled) */}
                {showViolin && (
                  <path
                    d={getViolinPath(values, 0, boxWidth * 1.5)}
                    fill={blackAndWhite ? '#888888' : color}
                    fillOpacity={blackAndWhite ? 0.1 : 0.15}
                    stroke={strokeColor}
                    strokeOpacity={0.3}
                  />
                )}

                {/* Jittered points (if enabled) */}
                {showJitter &&
                  getJitteredPoints(values, 0, boxWidth, idx).map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={2}
                      fill={pointColor}
                      fillOpacity={blackAndWhite ? 0.5 : 0.4}
                    />
                  ))}

                {/* Whiskers */}
                <line x1={0} y1={whiskerHigh} x2={0} y2={q3Y} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={0} y1={q1Y} x2={0} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={-10} y1={whiskerHigh} x2={10} y2={whiskerHigh} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={-10} y1={whiskerLow} x2={10} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />

                {/* Box */}
                <rect
                  x={-boxWidth / 2}
                  y={q3Y}
                  width={boxWidth}
                  height={q1Y - q3Y}
                  fill={boxFill}
                  fillOpacity={boxFillOpacity}
                  stroke={strokeColor}
                  strokeWidth={2}
                />

                {/* Median line */}
                <line
                  x1={-boxWidth / 2}
                  y1={medianY}
                  x2={boxWidth / 2}
                  y2={medianY}
                  stroke={strokeColor}
                  strokeWidth={3}
                />

                {/* Mean diamond */}
                <polygon
                  points={`0,${meanY - 4} 4,${meanY} 0,${meanY + 4} -4,${meanY}`}
                  fill={blackAndWhite ? '#ffffff' : 'hsl(var(--background))'}
                  stroke={strokeColor}
                  strokeWidth={2}
                />

                {/* Label */}
                <text
                  x={0}
                  y={labelY}
                  textAnchor="end"
                  transform={`rotate(-45, 0, ${labelY})`}
                  className="fill-foreground"
                  style={{ fontSize: '11px', fontWeight: 'bold', ...fontStyle }}
                >
                  {name.length > 20 ? name.slice(0, 17) + '...' : name}
                </text>
                <text
                  x={0}
                  y={labelY + 18}
                  textAnchor="end"
                  transform={`rotate(-45, 0, ${labelY + 18})`}
                  className="fill-muted-foreground"
                  style={{ fontSize: '10px', ...fontStyle }}
                >
                  n={stats.n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend - hide in export mode */}
      {!isExport && (
        <div 
          className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 text-xs text-muted-foreground"
          style={fontStyle}
        >
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
      )}
    </div>
  );
};