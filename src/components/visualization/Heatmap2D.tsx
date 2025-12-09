import React, { useMemo, useCallback } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';

interface Heatmap2DProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  selectedPoint: IndentationPoint | null;
  onPointSelect: (point: IndentationPoint | null) => void;
  onPointHover: (point: IndentationPoint | null) => void;
}

export const Heatmap2D: React.FC<Heatmap2DProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  selectedPoint,
  onPointSelect,
  onPointHover,
}) => {
  const { normalizedPoints, viewBox, pointRadius } = useMemo(() => {
    if (points.length === 0) {
      return { normalizedPoints: [], viewBox: '0 0 100 100', pointRadius: 2 };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    
    const padding = 40;
    const width = 800;
    const height = 600;
    
    const scale = Math.min((width - padding * 2) / xRange, (height - padding * 2) / yRange);
    
    const normalized = points.map(point => {
      const value = point.properties[selectedProperty] ?? 0;
      return {
        ...point,
        cx: padding + (point.x - xMin) * scale,
        cy: height - padding - (point.y - yMin) * scale,
        color: getColorForValue(value, minValue, maxValue, colorScheme),
        value,
      };
    });

    // Calculate optimal point radius based on density
    const avgDistance = Math.sqrt((xRange * yRange) / points.length);
    const radius = Math.max(4, Math.min(15, avgDistance * scale * 0.4));

    return {
      normalizedPoints: normalized,
      viewBox: `0 0 ${width} ${height}`,
      pointRadius: radius,
    };
  }, [points, selectedProperty, colorScheme, minValue, maxValue]);

  const handlePointClick = useCallback((point: IndentationPoint) => {
    onPointSelect(selectedPoint?.id === point.id ? null : point);
  }, [selectedPoint, onPointSelect]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted-foreground/30">
        <p className="text-muted-foreground font-mono">No data loaded</p>
      </div>
    );
  }

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{ background: 'hsl(var(--card))' }}
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Data points */}
      {normalizedPoints.map((point) => (
        <g key={point.id}>
          <circle
            cx={point.cx}
            cy={point.cy}
            r={pointRadius}
            fill={point.color}
            stroke={selectedPoint?.id === point.id ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
            strokeWidth={selectedPoint?.id === point.id ? 3 : 1}
            className="cursor-pointer transition-all duration-150 hover:opacity-80"
            onClick={() => handlePointClick(point)}
            onMouseEnter={() => onPointHover(point)}
            onMouseLeave={() => onPointHover(null)}
          />
          {selectedPoint?.id === point.id && (
            <circle
              cx={point.cx}
              cy={point.cy}
              r={pointRadius + 6}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          )}
        </g>
      ))}

      {/* Axis labels */}
      <text
        x="400"
        y="590"
        textAnchor="middle"
        className="fill-foreground font-mono text-sm"
      >
        X Position (mm)
      </text>
      <text
        x="15"
        y="300"
        textAnchor="middle"
        transform="rotate(-90 15 300)"
        className="fill-foreground font-mono text-sm"
      >
        Y Position (mm)
      </text>
    </svg>
  );
};
