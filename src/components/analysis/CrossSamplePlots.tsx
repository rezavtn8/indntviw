import React, { useMemo } from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { getSampleColor } from './SampleSelector';
import { 
  calculateNiceAxisBounds, 
  formatValue as sharedFormatValue,
  getBWStyle,
  BW_STYLES
} from './boxViolin/layout';

interface SampleData {
  id: string;
  name: string;
  colorIndex: number;
  values: number[];
  stats: DescriptiveStats;
}

interface CrossSamplePlotsProps {
  samples: SampleData[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
  isExport?: boolean;
  blackAndWhite?: boolean;
}

/**
 * Calculate standard deviation
 */
function calculateSD(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/**
 * Calculate bandwidth using Silverman's rule of thumb
 */
function calculateSilvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 1;
  
  const sorted = [...values].sort((a, b) => a - b);
  const sd = calculateSD(values);
  
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const iqr = sorted[q3Idx] - sorted[q1Idx];
  
  const silvermanFactor = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2);
  
  if (silvermanFactor <= 0) {
    return (sorted[n - 1] - sorted[0]) / 10 || 1;
  }
  
  return silvermanFactor;
}

export const CrossSamplePlots: React.FC<CrossSamplePlotsProps> = ({
  samples,
  selectedProperty,
  showViolin = false,
  showJitter = true,
  isExport = false,
  blackAndWhite = false,
}) => {
  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  // Use shared axis bounds calculation
  const { niceMin, niceMax, niceTicks } = useMemo(() => {
    const allValues = samples.flatMap(s => s.values);
    return calculateNiceAxisBounds(allValues);
  }, [samples]);

  const niceRange = niceMax - niceMin;

  const plotHeight = 200;
  const topMargin = 30;

  const valueToY = (value: number): number => {
    return topMargin + ((niceMax - value) / niceRange) * plotHeight;
  };

  // Use shared format function
  const formatValue = sharedFormatValue;

  // Generate violin path with Silverman's rule bandwidth
  const getViolinPath = (values: number[], centerX: number, width: number): string => {
    if (values.length < 2) return '';
    
    // Use Silverman's rule for bandwidth
    const bandwidth = calculateSilvermanBandwidth(values);
    const steps = 50; // More steps for smoother curves
    
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

  // Generate jittered points
  const getJitteredPoints = (values: number[], centerX: number, width: number, groupIndex: number): { x: number; y: number }[] => {
    const maxJitter = width * 0.3;
    return values.map((v, i) => ({
      x: centerX + (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
      y: valueToY(v),
    }));
  };

  const boxWidth = 40;
  const groupWidth = 100;
  const leftPadding = 70;
  const rightPadding = 60;
  const svgWidth = Math.max(450, samples.length * groupWidth + leftPadding + rightPadding);
  const labelAreaHeight = 80;
  const svgHeight = topMargin + plotHeight + labelAreaHeight;

  const fontStyle: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

  // Use shared B&W style getter
  const getStyle = (idx: number) => getBWStyle(idx);

  if (samples.length === 0) {
    return (
      <div className={isExport ? '' : 'border-2 border-border rounded-lg p-4'} style={fontStyle}>
        <p className="text-muted-foreground text-sm text-center" style={fontStyle}>
          Select samples to view plots
        </p>
      </div>
    );
  }

  return (
    <div className={isExport ? '' : 'border-2 border-border rounded-lg p-4'} style={fontStyle}>
      {!isExport && (
        <div className="mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider" style={fontStyle}>
            Cross-Sample Box Plot
            {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
          </h4>
        </div>
      )}

      <div className={isExport ? '' : 'overflow-x-auto'} style={isExport ? { width: svgWidth } : undefined}>
        <svg width={svgWidth} height={svgHeight} className="block" style={{ ...fontStyle, display: 'block' }}>
          {/* SVG Pattern definitions for B&W mode */}
          <defs>
            <pattern id="bw-stripe-cs" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#000" strokeWidth="0.5"/>
            </pattern>
            <pattern id="bw-dots-cs" patternUnits="userSpaceOnUse" width="4" height="4">
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

          {/* Box plots for each sample */}
          {samples.map((sample, idx) => {
            const centerX = leftPadding + idx * groupWidth + groupWidth / 2;
            const { stats, values } = sample;
            const color = getSampleColor(sample.colorIndex);
            
            if (values.length === 0) return null;

            const q1Y = valueToY(stats.q1);
            const q3Y = valueToY(stats.q3);
            const medianY = valueToY(stats.median);
            const meanY = valueToY(stats.mean);
            const whiskerLow = valueToY(Math.max(stats.min, stats.q1 - 1.5 * stats.iqr));
            const whiskerHigh = valueToY(Math.min(stats.max, stats.q3 + 1.5 * stats.iqr));
            const labelY = topMargin + plotHeight + 25;

            // Get colors based on B&W mode
            const bwStyle = getStyle(idx);
            const boxFill = blackAndWhite 
              ? (bwStyle.pattern === 'stripe' ? 'url(#bw-stripe-cs)' : bwStyle.pattern === 'dots' ? 'url(#bw-dots-cs)' : bwStyle.fill)
              : color;
            const boxFillOpacity = blackAndWhite ? bwStyle.fillOpacity : 0.3;
            const strokeColor = blackAndWhite ? '#000000' : color;
            const pointColor = blackAndWhite ? '#333333' : color;

            return (
              <g key={sample.id}>
                {/* Violin */}
                {showViolin && (
                  <path
                    d={getViolinPath(values, centerX, boxWidth * 1.5)}
                    fill={blackAndWhite ? '#888888' : color}
                    fillOpacity={blackAndWhite ? 0.1 : 0.15}
                    stroke={strokeColor}
                    strokeOpacity={0.3}
                  />
                )}

                {/* Jittered points */}
                {showJitter && getJitteredPoints(values, centerX, boxWidth, idx).map((pt, i) => (
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
                <line x1={centerX} y1={whiskerHigh} x2={centerX} y2={q3Y} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={centerX} y1={q1Y} x2={centerX} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={centerX - 10} y1={whiskerHigh} x2={centerX + 10} y2={whiskerHigh} stroke={strokeColor} strokeWidth={1.5} />
                <line x1={centerX - 10} y1={whiskerLow} x2={centerX + 10} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />

                {/* Box */}
                <rect
                  x={centerX - boxWidth / 2}
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
                  x1={centerX - boxWidth / 2}
                  y1={medianY}
                  x2={centerX + boxWidth / 2}
                  y2={medianY}
                  stroke={strokeColor}
                  strokeWidth={3}
                />

                {/* Mean diamond */}
                <polygon
                  points={`${centerX},${meanY - 4} ${centerX + 4},${meanY} ${centerX},${meanY + 4} ${centerX - 4},${meanY}`}
                  fill={blackAndWhite ? '#ffffff' : 'hsl(var(--background))'}
                  stroke={strokeColor}
                  strokeWidth={2}
                />

                {/* Label */}
                <text
                  x={centerX}
                  y={labelY}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, ${labelY})`}
                  className="fill-foreground"
                  style={{ fontSize: '11px', fontWeight: 'bold', ...fontStyle }}
                >
                  {sample.name.length > 20 ? sample.name.slice(0, 17) + '...' : sample.name}
                </text>
                <text
                  x={centerX}
                  y={labelY + 18}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, ${labelY + 18})`}
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
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground" style={fontStyle}>
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
        </div>
      )}
    </div>
  );
};