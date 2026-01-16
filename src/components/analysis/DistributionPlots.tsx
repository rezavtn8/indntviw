import React, { useMemo, useState } from 'react';
import { DescriptiveStats, shapiroWilkTest } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface DistributionPlotsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  isExport?: boolean;
}

export const DistributionPlots: React.FC<DistributionPlotsProps> = ({ data, selectedProperty, isExport = false }) => {
  const [binCount, setBinCount] = useState(20);

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  // Calculate global range
  const { globalMin, globalMax, range } = useMemo(() => {
    const allValues = data.flatMap(d => d.values);
    if (allValues.length === 0) return { globalMin: 0, globalMax: 100, range: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return { globalMin: min, globalMax: max, range: max - min || 1 };
  }, [data]);

  // Use fixed bin count for export (no slider)
  const effectiveBinCount = isExport ? 20 : binCount;

  // Calculate Silverman bandwidth for a dataset
  const calculateSilvermanBandwidth = (values: number[]): number => {
    const n = values.length;
    if (n < 2) return range / 15;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const iqr = sorted[q3Idx] - sorted[q1Idx];
    
    const silvermanFactor = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2);
    
    return silvermanFactor > 0 ? silvermanFactor : range / 15;
  };

  // Generate histograms using effective bin count
  const histograms = useMemo(() => {
    const binWidth = range / effectiveBinCount;
    
    return data.map(d => {
      const bins = Array(effectiveBinCount).fill(0);
      d.values.forEach(v => {
        const binIndex = Math.min(Math.floor((v - globalMin) / binWidth), effectiveBinCount - 1);
        if (binIndex >= 0) bins[binIndex]++;
      });
      
      // Normalize to density
      const maxCount = Math.max(...bins, 1);
      const densities = bins.map(b => b / d.values.length);
      const maxDensity = Math.max(...densities, 0.001);
      
      // Calculate KDE with Silverman's rule bandwidth
      const kdePoints: { x: number; y: number }[] = [];
      const bandwidth = calculateSilvermanBandwidth(d.values);
      for (let i = 0; i <= 50; i++) {
        const x = globalMin + (i / 50) * range;
        let density = 0;
        for (const v of d.values) {
          const u = (x - v) / bandwidth;
          density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
        }
        density /= d.values.length * bandwidth;
        kdePoints.push({ x, y: density });
      }
      const kdeMax = Math.max(...kdePoints.map(p => p.y), 0.001);
      
      return {
        name: d.name,
        color: d.color,
        bins,
        maxCount,
        densities,
        maxDensity,
        kdePoints,
        kdeMax,
        normality: shapiroWilkTest(d.values),
        stats: d.stats,
      };
    });
  }, [data, effectiveBinCount, globalMin, range]);

  const svgWidth = isExport ? 550 : 400;
  const svgHeight = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    if (Math.abs(val) >= 1) return val.toFixed(1);
    return val.toFixed(3);
  };

  return (
    <div className={isExport ? '' : 'border-2 border-border rounded-lg p-4'} style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {!isExport && (
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            Distribution Analysis
            {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Bins:</span>
            <Slider
              value={[binCount]}
              onValueChange={([v]) => setBinCount(v)}
              min={5}
              max={50}
              step={1}
              className="w-24"
            />
            <span className="text-xs w-6" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{binCount}</span>
          </div>
        </div>
      )}

      <div className={isExport ? 'flex flex-col gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
        {histograms.map((hist, idx) => (
          <div key={hist.name} className="p-3 bg-muted/30 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: hist.color }} />
                <span className="text-sm font-bold" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{hist.name}</span>
                <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>n={hist.stats.n}</span>
              </div>
              <Badge variant={hist.normality.isNormal ? 'secondary' : 'outline'} className="text-xs">
                {hist.normality.isNormal ? 'Normal' : 'Non-normal'}
              </Badge>
            </div>

            {/* Histogram SVG */}
            <svg width={svgWidth} height={svgHeight} className="block" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                {/* Y-axis */}
                <line x1={0} y1={0} x2={0} y2={plotHeight} stroke="currentColor" strokeOpacity={0.3} />
                {[0, 0.5, 1].map(frac => (
                  <g key={frac}>
                    <line x1={-5} y1={plotHeight * (1 - frac)} x2={0} y2={plotHeight * (1 - frac)} stroke="currentColor" strokeOpacity={0.5} />
                    <text x={-8} y={plotHeight * (1 - frac) + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {(frac * hist.maxDensity).toFixed(2)}
                    </text>
                  </g>
                ))}

                {/* X-axis */}
                <line x1={0} y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="currentColor" strokeOpacity={0.3} />
                {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                  <g key={frac}>
                    <line x1={frac * plotWidth} y1={plotHeight} x2={frac * plotWidth} y2={plotHeight + 5} stroke="currentColor" strokeOpacity={0.5} />
                    <text x={frac * plotWidth} y={plotHeight + 18} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {formatValue(globalMin + frac * range)}
                    </text>
                  </g>
                ))}

                {/* Histogram bars */}
                {hist.bins.map((count, i) => {
                  const barWidth = plotWidth / effectiveBinCount;
                  const barHeight = (hist.densities[i] / hist.maxDensity) * plotHeight;
                  return (
                    <rect
                      key={i}
                      x={i * barWidth}
                      y={plotHeight - barHeight}
                      width={barWidth - 1}
                      height={barHeight}
                      fill={hist.color}
                      fillOpacity={0.4}
                      stroke={hist.color}
                      strokeOpacity={0.6}
                    />
                  );
                })}

                {/* KDE curve */}
                <path
                  d={hist.kdePoints.map((pt, i) => {
                    const x = ((pt.x - globalMin) / range) * plotWidth;
                    const y = plotHeight - (pt.y / hist.kdeMax) * plotHeight * (hist.maxDensity / hist.kdeMax);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={hist.color}
                  strokeWidth={2}
                />

                {/* Mean line */}
                <line
                  x1={((hist.stats.mean - globalMin) / range) * plotWidth}
                  y1={0}
                  x2={((hist.stats.mean - globalMin) / range) * plotWidth}
                  y2={plotHeight}
                  stroke={hist.color}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />

                {/* Median line */}
                <line
                  x1={((hist.stats.median - globalMin) / range) * plotWidth}
                  y1={0}
                  x2={((hist.stats.median - globalMin) / range) * plotWidth}
                  y2={plotHeight}
                  stroke={hist.color}
                  strokeWidth={2}
                  strokeDasharray="1 2"
                />
              </g>
            </svg>

            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-2 mt-2 text-xs" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <div>
                <span className="text-muted-foreground block">Mean</span>
                <span>{formatValue(hist.stats.mean)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Median</span>
                <span>{formatValue(hist.stats.median)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">SD</span>
                <span>{formatValue(hist.stats.sd)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Skew</span>
                <span>{hist.stats.skewness.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend - hide in export mode */}
      {!isExport && (
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-foreground" />
            <span>Mean</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dotted border-foreground" />
            <span>Median</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-foreground" />
            <span>KDE</span>
          </div>
        </div>
      )}
    </div>
  );
};
