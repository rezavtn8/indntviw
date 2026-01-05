import React, { useMemo } from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { getSampleColor } from './SampleSelector';

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
}

export const CrossSamplePlots: React.FC<CrossSamplePlotsProps> = ({
  samples,
  selectedProperty,
  showViolin = false,
  showJitter = true,
}) => {
  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  // Calculate global min/max for consistent scaling
  const { globalMin, globalMax, range } = useMemo(() => {
    const allValues = samples.flatMap(s => s.values);
    if (allValues.length === 0) return { globalMin: 0, globalMax: 100, range: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    return { globalMin: min - padding, globalMax: max + padding, range: max - min + 2 * padding };
  }, [samples]);

  const plotHeight = 200;
  const topMargin = 30;

  const valueToY = (value: number): number => {
    return topMargin + ((globalMax - value) / range) * plotHeight;
  };

  // Calculate nice rounded tick values for Y-axis
  const getNiceTicks = (min: number, max: number, targetCount: number = 5): number[] => {
    const range = max - min;
    if (range === 0) return [min];
    
    const roughStep = range / (targetCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    
    let niceStep: number;
    if (residual <= 1.5) niceStep = magnitude;
    else if (residual <= 3) niceStep = 2 * magnitude;
    else if (residual <= 7) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;
    
    const niceMin = Math.floor(min / niceStep) * niceStep;
    const niceMax = Math.ceil(max / niceStep) * niceStep;
    
    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
      if (v >= min - niceStep * 0.1 && v <= max + niceStep * 0.1) {
        ticks.push(v);
      }
    }
    return ticks.length > 0 ? ticks : [min, max];
  };

  const yTicks = useMemo(() => getNiceTicks(globalMin, globalMax, 5), [globalMin, globalMax]);

  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    if (absVal >= 1000) return val.toFixed(0);
    if (absVal >= 100) return val.toFixed(1);
    if (absVal >= 1) return val.toFixed(2);
    if (absVal >= 0.01) return val.toFixed(3);
    return val.toExponential(1);
  };

  // Generate violin path
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
    return values.slice(0, 100).map((v, i) => ({
      x: centerX + (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
      y: valueToY(v),
    }));
  };

  const boxWidth = 40;
  const groupWidth = 100;
  const leftPadding = 70;
  const rightPadding = 40;
  const svgWidth = Math.max(450, samples.length * groupWidth + leftPadding + rightPadding);
  const labelAreaHeight = 80;
  const svgHeight = topMargin + plotHeight + labelAreaHeight;

  if (samples.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-4" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <p className="text-muted-foreground font-mono text-sm text-center">
          Select samples to view plots
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-border rounded-lg p-4" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="mb-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          Cross-Sample Box Plot
          {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
        </h4>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block mx-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {/* Y-axis with nice ticks */}
          <g>
            {yTicks.map(value => {
              const y = valueToY(value);
              return (
                <g key={value}>
                  <line x1={50} y1={y} x2={svgWidth - 20} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={45} y={y + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
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

            return (
              <g key={sample.id}>
                {/* Violin */}
                {showViolin && (
                  <path
                    d={getViolinPath(values, centerX, boxWidth * 1.5)}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
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
                  y={labelY}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, ${labelY})`}
                  className="fill-foreground"
                  style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  {sample.name.length > 20 ? sample.name.slice(0, 17) + '...' : sample.name}
                </text>
                <text
                  x={centerX}
                  y={labelY + 18}
                  textAnchor="end"
                  transform={`rotate(-45, ${centerX}, ${labelY + 18})`}
                  className="fill-muted-foreground"
                  style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  n={stats.n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs font-mono text-muted-foreground">
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
    </div>
  );
};
