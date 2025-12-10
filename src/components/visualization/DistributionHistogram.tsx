import React, { useMemo } from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DistributionHistogramProps {
  allPoints: IndentationPoint[];
  selectedPoints: IndentationPoint[];
  selectedProperty: string;
  bins?: number;
}

export const DistributionHistogram: React.FC<DistributionHistogramProps> = ({
  allPoints,
  selectedPoints,
  selectedProperty,
  bins = 15,
}) => {
  const histogramData = useMemo(() => {
    if (allPoints.length === 0) return [];

    const allValues = allPoints
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    const selectedValues = selectedPoints
      .map(p => p.properties[selectedProperty])
      .filter(v => v !== undefined && !isNaN(v));

    if (allValues.length === 0) return [];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;
    const binWidth = range / bins;

    // Create bins
    const data = Array.from({ length: bins }, (_, i) => {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const binCenter = (binStart + binEnd) / 2;

      const allCount = allValues.filter(v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)).length;
      const selectedCount = selectedValues.filter(v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)).length;

      return {
        range: binCenter,
        label: binCenter >= 1000 ? binCenter.toFixed(0) : binCenter >= 1 ? binCenter.toFixed(1) : binCenter.toFixed(2),
        all: allCount,
        selected: selectedCount,
      };
    });

    return data;
  }, [allPoints, selectedPoints, selectedProperty, bins]);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const hasSelection = selectedPoints.length > 0;

  if (allPoints.length === 0) {
    return null;
  }

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm">
      <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground mb-3">
        Distribution
      </h3>
      
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '2px solid hsl(var(--border))',
                borderRadius: 0,
                fontSize: 11,
                fontFamily: 'monospace',
              }}
              formatter={(value: number, name: string) => [
                value,
                name === 'all' ? 'All Points' : 'Selected'
              ]}
              labelFormatter={(label) => `${getPropertyLabel(selectedProperty)}: ${label} ${getPropertyUnit(selectedProperty)}`}
            />
            <Bar 
              dataKey="all" 
              fill="hsl(var(--muted-foreground))" 
              opacity={hasSelection ? 0.4 : 0.8}
              name="all"
            />
            {hasSelection && (
              <Bar 
                dataKey="selected" 
                fill="hsl(var(--primary))" 
                opacity={0.9}
                name="selected"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 font-mono text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-muted-foreground opacity-60" />
          <span className="text-muted-foreground">All ({allPoints.length})</span>
        </div>
        {hasSelection && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary" />
            <span className="text-primary font-bold">Selected ({selectedPoints.length})</span>
          </div>
        )}
      </div>
    </div>
  );
};
