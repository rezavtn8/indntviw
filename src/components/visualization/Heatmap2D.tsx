import React, { useMemo, useCallback, useState } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';
import { generateContours, generateFilledContours } from '@/utils/contourGenerator';

interface Heatmap2DProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  selectedPoint: IndentationPoint | null;
  highlightedPoints?: number[];
  showContours?: boolean;
  showInterpolation?: boolean;
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
  highlightedPoints = [],
  showContours = false,
  showInterpolation = false,
  onPointSelect,
  onPointHover,
}) => {
  const { normalizedPoints, viewBox, pointRadius, scale, padding, xMin, yMin, height } = useMemo(() => {
    if (points.length === 0) {
      return { normalizedPoints: [], viewBox: '0 0 100 100', pointRadius: 2, scale: 1, padding: 40, xMin: 0, yMin: 0, height: 600 };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    
    const xMinVal = Math.min(...xValues);
    const xMaxVal = Math.max(...xValues);
    const yMinVal = Math.min(...yValues);
    const yMaxVal = Math.max(...yValues);
    
    const xRange = xMaxVal - xMinVal || 1;
    const yRange = yMaxVal - yMinVal || 1;
    
    const pad = 40;
    const width = 800;
    const h = 600;
    
    const scaleVal = Math.min((width - pad * 2) / xRange, (h - pad * 2) / yRange);
    
    const normalized = points.map(point => {
      const value = point.properties[selectedProperty] ?? 0;
      return {
        ...point,
        cx: pad + (point.x - xMinVal) * scaleVal,
        cy: h - pad - (point.y - yMinVal) * scaleVal,
        color: getColorForValue(value, minValue, maxValue, colorScheme),
        value,
        isHighlighted: highlightedPoints.includes(point.id),
      };
    });

    // Calculate optimal point radius based on density
    const avgDistance = Math.sqrt((xRange * yRange) / points.length);
    const radius = Math.max(4, Math.min(15, avgDistance * scaleVal * 0.4));

    return {
      normalizedPoints: normalized,
      viewBox: `0 0 ${width} ${h}`,
      pointRadius: radius,
      scale: scaleVal,
      padding: pad,
      xMin: xMinVal,
      yMin: yMinVal,
      height: h,
    };
  }, [points, selectedProperty, colorScheme, minValue, maxValue, highlightedPoints]);

  // Generate contour lines
  const contourLines = useMemo(() => {
    if (!showContours || points.length < 4) return [];
    return generateContours(points, selectedProperty, 8, 40);
  }, [points, selectedProperty, showContours]);

  // Generate interpolated cells for smooth heatmap
  const interpolatedCells = useMemo(() => {
    if (!showInterpolation || points.length < 3) return [];
    return generateFilledContours(points, selectedProperty, 40);
  }, [points, selectedProperty, showInterpolation]);

  const handlePointClick = useCallback((point: IndentationPoint) => {
    onPointSelect(selectedPoint?.id === point.id ? null : point);
  }, [selectedPoint, onPointSelect]);

  // Transform contour coordinates to SVG space
  const transformPoint = useCallback((x: number, y: number) => ({
    cx: padding + (x - xMin) * scale,
    cy: height - padding - (y - yMin) * scale,
  }), [padding, xMin, yMin, scale, height]);

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

      {/* Interpolated fill (smooth heatmap) */}
      {showInterpolation && interpolatedCells.map((cell, i) => {
        const { cx, cy } = transformPoint(cell.x, cell.y);
        const color = getColorForValue(cell.value, minValue, maxValue, colorScheme);
        const cellSize = cell.width * scale;
        return (
          <rect
            key={`cell-${i}`}
            x={cx - cellSize / 2}
            y={cy - cellSize / 2}
            width={cellSize}
            height={cellSize}
            fill={color}
            opacity={0.7}
          />
        );
      })}

      {/* Contour lines */}
      {showContours && contourLines.map((contour, i) => (
        <g key={`contour-${i}`}>
          {contour.paths.map((path, j) => {
            if (path.length < 2) return null;
            const start = transformPoint(path[0].x, path[0].y);
            const end = transformPoint(path[1].x, path[1].y);
            return (
              <line
                key={`path-${i}-${j}`}
                x1={start.cx}
                y1={start.cy}
                x2={end.cx}
                y2={end.cy}
                stroke="hsl(var(--foreground))"
                strokeWidth="0.5"
                opacity="0.6"
              />
            );
          })}
        </g>
      ))}

      {/* Data points */}
      {normalizedPoints.map((point) => (
        <g key={point.id}>
          {/* Highlight ring for outliers */}
          {point.isHighlighted && (
            <circle
              cx={point.cx}
              cy={point.cy}
              r={pointRadius + 8}
              fill="none"
              stroke="hsl(var(--destructive))"
              strokeWidth="2"
              strokeDasharray="3 2"
            />
          )}
          <circle
            cx={point.cx}
            cy={point.cy}
            r={pointRadius}
            fill={point.color}
            stroke={
              point.isHighlighted 
                ? 'hsl(var(--destructive))' 
                : selectedPoint?.id === point.id 
                  ? 'hsl(var(--foreground))' 
                  : 'hsl(var(--border))'
            }
            strokeWidth={selectedPoint?.id === point.id || point.isHighlighted ? 3 : 1}
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

      {/* Contour level labels */}
      {showContours && contourLines.length > 0 && (
        <g className="pointer-events-none">
          {contourLines.filter((_, i) => i % 2 === 0).map((contour, i) => {
            const firstPath = contour.paths[0];
            if (!firstPath || firstPath.length < 1) return null;
            const pos = transformPoint(firstPath[0].x, firstPath[0].y);
            return (
              <text
                key={`label-${i}`}
                x={pos.cx}
                y={pos.cy - 5}
                fontSize="8"
                fill="hsl(var(--foreground))"
                textAnchor="middle"
                className="font-mono"
              >
                {contour.level.toFixed(1)}
              </text>
            );
          })}
        </g>
      )}

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
