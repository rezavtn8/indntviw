import React, { useMemo } from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';

interface BoxViolinPlotsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
}

export const BoxViolinPlots: React.FC<BoxViolinPlotsProps> = ({
  data,
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
    const allValues = data.flatMap(d => d.values);
    if (allValues.length === 0) return { globalMin: 0, globalMax: 100, range: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
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

  return (
    <div className="border-2 border-border rounded-lg p-4">
      <div className="mb-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
          Box Plot Comparison
          {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
        </h4>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgWidth} height={280} className="block mx-auto">
          {/* Y-axis */}
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const value = globalMin + frac * range;
              const y = valueToY(value);
              return (
                <g key={frac}>
                  <line x1={50} y1={y + 20} x2={svgWidth - 20} y2={y + 20} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={45} y={y + 24} textAnchor="end" className="fill-muted-foreground font-mono text-xs">
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Box plots */}
          {data.map((d, idx) => {
            const centerX = 80 + idx * groupWidth + groupWidth / 2;
            const { stats, values, color, name } = d;
            
            if (values.length === 0) return null;

            const q1Y = valueToY(stats.q1);
            const q3Y = valueToY(stats.q3);
            const medianY = valueToY(stats.median);
            const meanY = valueToY(stats.mean);
            const minY = valueToY(stats.min);
            const maxY = valueToY(stats.max);
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
                  y={230}
                  textAnchor="middle"
                  className="fill-foreground font-mono text-xs font-bold"
                >
                  {name}
                </text>
                <text
                  x={centerX}
                  y={245}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-xs"
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
