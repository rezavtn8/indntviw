import React, { useMemo, useCallback } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';
import { generateBoundaryContour, generateFilledContours, generateSmoothBoundaryPath } from '@/utils/contourGenerator';

export type HeatmapMode = 'dots' | 'filled';

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
  heatmapMode?: HeatmapMode;
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
  heatmapMode = 'dots',
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

  // Generate boundary contour for display and clipping
  const boundaryContour = useMemo(() => {
    if (points.length < 3) return [];
    return generateBoundaryContour(points);
  }, [points]);

  // Phase 2: Generate dense interpolation grid for gradient fill
  const gradientCells = useMemo(() => {
    if (heatmapMode === 'filled') {
      if (points.length < 3) return [];
      // Very dense grid for smooth gradient - 200x200 resolution
      return generateFilledContours(points, selectedProperty, 200);
    }
    return [];
  }, [points, selectedProperty, heatmapMode]);

  // Interpolated cells for dots mode background
  const interpolatedCells = useMemo(() => {
    if (showInterpolation && heatmapMode === 'dots') {
      if (points.length < 3) return [];
      return generateFilledContours(points, selectedProperty, 80);
    }
    return [];
  }, [points, selectedProperty, showInterpolation, heatmapMode]);

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
        {/* Smooth clip path for filled heatmap with padding */}
        {boundaryContour.length >= 3 && (
          <clipPath id="heatmap-smooth-clip">
            <path
              d={generateSmoothBoundaryPath(
                boundaryContour.map(p => {
                  const { cx, cy } = transformPoint(p.x, p.y);
                  return { x: cx, y: cy };
                }),
                pointRadius * 0.5
              )}
            />
          </clipPath>
        )}
        {/* Phase 3: Blur filter for smooth gradient blending */}
        <filter id="gradient-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Phase 1: Boundary shape filled with Phase 2+3: Dense gradient cells with blur */}
      {heatmapMode === 'filled' && gradientCells.length > 0 && (
        <g clipPath="url(#heatmap-smooth-clip)">
          {/* Apply blur for smooth blending between cells */}
          <g filter="url(#gradient-blur)">
            {gradientCells.map((cell, i) => {
              const { cx, cy } = transformPoint(cell.x, cell.y);
              const color = getColorForValue(cell.value, minValue, maxValue, colorScheme);
              // Cells overlap by 2x to ensure no gaps
              const cellSize = Math.max(cell.width, cell.height) * scale * 2;
              return (
                <rect
                  key={`g-${i}`}
                  x={cx - cellSize / 2}
                  y={cy - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                />
              );
            })}
          </g>
        </g>
      )}

      {/* Background interpolation for dots mode */}
      {heatmapMode === 'dots' && showInterpolation && interpolatedCells.length > 0 && (
        <g clipPath="url(#heatmap-smooth-clip)" opacity="0.6">
          {interpolatedCells.map((cell, i) => {
            const { cx, cy } = transformPoint(cell.x, cell.y);
            const color = getColorForValue(cell.value, minValue, maxValue, colorScheme);
            const cellSize = cell.width * scale * 1.3;
            return (
              <rect
                key={`cell-${i}`}
                x={cx - cellSize / 2}
                y={cy - cellSize / 2}
                width={cellSize}
                height={cellSize}
                fill={color}
              />
            );
          })}
        </g>
      )}

      {/* Smooth boundary contour line */}
      {showContours && boundaryContour.length >= 3 && (
        <path
          d={generateSmoothBoundaryPath(
            boundaryContour.map(p => {
              const { cx, cy } = transformPoint(p.x, p.y);
              return { x: cx, y: cy };
            }),
            pointRadius * 0.5
          )}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}

      {/* Solid smooth boundary outline for filled mode */}
      {heatmapMode === 'filled' && boundaryContour.length >= 3 && (
        <path
          d={generateSmoothBoundaryPath(
            boundaryContour.map(p => {
              const { cx, cy } = transformPoint(p.x, p.y);
              return { x: cx, y: cy };
            }),
            pointRadius * 0.5
          )}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {/* Data points - only show in dots mode */}
      {heatmapMode === 'dots' && normalizedPoints.map((point) => (
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
