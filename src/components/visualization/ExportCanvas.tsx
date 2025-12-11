import React, { useMemo, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { Zone, ZonePoint, ExportSettings } from '@/types/zones';
import { getColorForValue } from '@/utils/colorScales';
import { getZoneSVGPath, getZoneEllipseAttrs, getZoneDashArray, getZoneCentroid } from '@/utils/zoneUtils';
import { generateZoneBoundary, boundaryToSVGPath } from '@/utils/boundaryGenerator';
import { DrawingTool } from '@/components/controls/ZoneToolbar';

interface ExportCanvasProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  zones: Zone[];
  selectedZoneId: string | null;
  settings: ExportSettings;
  drawingTool: DrawingTool;
  selectedPointIds: number[];
  onZoneCreated: (zone: Partial<Zone>) => void;
  onZoneSelect: (zoneId: string | null) => void;
  onPointsSelected: (pointIds: number[]) => void;
}

export interface ExportCanvasRef {
  getSVGElement: () => SVGSVGElement | null;
  exportToDataURL: (format: 'png' | 'svg', dpi: number) => Promise<string>;
}

export const ExportCanvas = forwardRef<ExportCanvasRef, ExportCanvasProps>(({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  zones,
  selectedZoneId,
  settings,
  drawingTool,
  selectedPointIds,
  onZoneCreated,
  onZoneSelect,
  onPointsSelected,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<ZonePoint[]>([]);
  const [boxStart, setBoxStart] = useState<ZonePoint | null>(null);
  const [currentPos, setCurrentPos] = useState<ZonePoint | null>(null);

  // Canvas dimensions with proper margins for labels
  const margin = { top: 60, right: 120, bottom: 60, left: 70 };
  const width = settings.width;
  const height = settings.height;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Calculate raw data bounds (without padding)
  const rawDataBounds = useMemo(() => {
    if (points.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    
    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues),
    };
  }, [points]);

  // Calculate final bounds with padding or custom values
  const { xMin, xMax, yMin, yMax, scaleX, scaleY } = useMemo(() => {
    // Use custom bounds if set, otherwise use raw data bounds with padding
    if (!settings.useAutoAxisBounds && settings.customAxisBounds) {
      const bounds = settings.customAxisBounds;
      const xRange = bounds.xMax - bounds.xMin || 1;
      const yRange = bounds.yMax - bounds.yMin || 1;
      
      return {
        xMin: bounds.xMin,
        xMax: bounds.xMax,
        yMin: bounds.yMin,
        yMax: bounds.yMax,
        scaleX: plotWidth / xRange,
        scaleY: plotHeight / yRange,
      };
    }
    
    // Auto bounds with configurable padding
    const xRange = rawDataBounds.xMax - rawDataBounds.xMin || 1;
    const yRange = rawDataBounds.yMax - rawDataBounds.yMin || 1;
    
    const paddingFactor = settings.axisPadding / 100;
    const xPadding = xRange * paddingFactor;
    const yPadding = yRange * paddingFactor;
    
    const paddedXMin = rawDataBounds.xMin - xPadding;
    const paddedXMax = rawDataBounds.xMax + xPadding;
    const paddedYMin = rawDataBounds.yMin - yPadding;
    const paddedYMax = rawDataBounds.yMax + yPadding;
    
    const paddedXRange = paddedXMax - paddedXMin;
    const paddedYRange = paddedYMax - paddedYMin;
    
    return {
      xMin: paddedXMin,
      xMax: paddedXMax,
      yMin: paddedYMin,
      yMax: paddedYMax,
      scaleX: plotWidth / paddedXRange,
      scaleY: plotHeight / paddedYRange,
    };
  }, [rawDataBounds, settings.useAutoAxisBounds, settings.customAxisBounds, settings.axisPadding, plotWidth, plotHeight]);

  // Transform data coordinates to SVG coordinates
  const transformPoint = useCallback((x: number, y: number) => ({
    cx: margin.left + (x - xMin) * scaleX,
    cy: margin.top + plotHeight - (y - yMin) * scaleY,
  }), [margin.left, margin.top, xMin, yMin, scaleX, scaleY, plotHeight]);

  // Inverse transform: SVG to data coordinates
  const inverseTransform = useCallback((cx: number, cy: number) => ({
    x: xMin + (cx - margin.left) / scaleX,
    y: yMin + (margin.top + plotHeight - cy) / scaleY,
  }), [margin.left, margin.top, xMin, yMin, scaleX, scaleY, plotHeight]);

  // Get SVG coordinates from mouse event
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement>): ZonePoint => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const svgY = ((e.clientY - rect.top) / rect.height) * height;
    return inverseTransform(svgX, svgY);
  }, [width, height, inverseTransform]);

  // Parse custom tick values
  const parseCustomTicks = (tickString: string): number[] => {
    return tickString
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
  };

  // Generate axis ticks
  const { xTicks, yTicks } = useMemo(() => {
    const generateTicks = (min: number, max: number, count: number = 5) => {
      const range = max - min;
      const step = range / count;
      const ticks: number[] = [];
      for (let i = 0; i <= count; i++) {
        ticks.push(min + step * i);
      }
      return ticks;
    };

    const xTicks = settings.useCustomXTicks && settings.customXTicks
      ? parseCustomTicks(settings.customXTicks)
      : generateTicks(xMin, xMax, settings.xTickCount);

    const yTicks = settings.useCustomYTicks && settings.customYTicks
      ? parseCustomTicks(settings.customYTicks)
      : generateTicks(yMin, yMax, settings.yTickCount);

    return { xTicks, yTicks };
  }, [xMin, xMax, yMin, yMax, settings.xTickCount, settings.yTickCount, settings.useCustomXTicks, settings.useCustomYTicks, settings.customXTicks, settings.customYTicks]);

  // Normalized points for rendering
  const normalizedPoints = useMemo(() => {
    return points.map(point => {
      const value = point.properties[selectedProperty] ?? 0;
      const { cx, cy } = transformPoint(point.x, point.y);
      return {
        ...point,
        cx,
        cy,
        color: getColorForValue(value, minValue, maxValue, colorScheme),
        value,
      };
    });
  }, [points, selectedProperty, colorScheme, minValue, maxValue, transformPoint]);

  // Point radius based on density
  const pointRadius = useMemo(() => {
    if (points.length === 0) return 5;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const avgDistance = Math.sqrt((xRange * yRange) / points.length);
    return Math.max(3, Math.min(12, avgDistance * scaleX * 0.35));
  }, [points.length, xMin, xMax, yMin, yMax, scaleX]);

  // Get property label
  const propertyLabel = useMemo(() => {
    const config = PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
    return config ? `${config.label}` : selectedProperty;
  }, [selectedProperty]);

  const propertyUnit = useMemo(() => {
    const config = PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
    return config?.unit || '';
  }, [selectedProperty]);

  // Generate preview boundary for selected points
  const selectionPreviewPath = useMemo(() => {
    if (selectedPointIds.length < 1) return null;
    
    const selectedPoints = points.filter(p => selectedPointIds.includes(p.id));
    if (selectedPoints.length === 0) return null;
    
    const memberCoords: ZonePoint[] = selectedPoints.map(p => ({ x: p.x, y: p.y }));
    // Use tight defaults for preview
    const boundaryPoints = generateZoneBoundary(memberCoords, 0.1, 0.5, 'convex');
    
    if (boundaryPoints.length < 3) return null;
    
    return boundaryToSVGPath(boundaryPoints, transformPoint);
  }, [selectedPointIds, points, transformPoint]);

  // Helper to check if point is in polygon (for lasso selection)
  const isPointInPolygon = useCallback((point: { x: number; y: number }, polygon: ZonePoint[]): boolean => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Helper to check if point is in box
  const isPointInBox = useCallback((point: { x: number; y: number }, start: ZonePoint, end: ZonePoint): boolean => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }, []);

  // Drawing handlers for point selection
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingTool === 'select') {
      // Click to toggle individual point selection
      const coords = getSVGCoords(e);
      const clickedPoint = points.find(p => {
        const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
        return dist < pointRadius * 2 / scaleX; // Approximate click radius
      });
      
      if (clickedPoint) {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl) {
          // Toggle selection
          if (selectedPointIds.includes(clickedPoint.id)) {
            onPointsSelected(selectedPointIds.filter(id => id !== clickedPoint.id));
          } else {
            onPointsSelected([...selectedPointIds, clickedPoint.id]);
          }
        } else {
          // Single select
          onPointsSelected([clickedPoint.id]);
        }
      } else {
        // Click on empty space - clear selection or select zone
        onZoneSelect(null);
        if (!e.ctrlKey && !e.metaKey) {
          onPointsSelected([]);
        }
      }
      return;
    }

    const coords = getSVGCoords(e);
    setIsDrawing(true);

    if (drawingTool === 'lasso') {
      setDrawingPath([coords]);
    } else if (drawingTool === 'box') {
      setBoxStart(coords);
      setCurrentPos(coords);
    }
  }, [drawingTool, getSVGCoords, points, pointRadius, scaleX, selectedPointIds, onPointsSelected, onZoneSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const coords = getSVGCoords(e);

    if (drawingTool === 'lasso') {
      setDrawingPath(prev => [...prev, coords]);
    } else if (drawingTool === 'box') {
      setCurrentPos(coords);
    }
  }, [isDrawing, drawingTool, getSVGCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;

    if (drawingTool === 'lasso' && drawingPath.length >= 3) {
      // Select all points within the lasso
      const selectedIds = points
        .filter(p => isPointInPolygon({ x: p.x, y: p.y }, drawingPath))
        .map(p => p.id);
      
      if (isAdditive) {
        onPointsSelected([...new Set([...selectedPointIds, ...selectedIds])]);
      } else {
        onPointsSelected(selectedIds);
      }
    } else if (drawingTool === 'box' && boxStart && currentPos) {
      // Select all points within the box
      const selectedIds = points
        .filter(p => isPointInBox({ x: p.x, y: p.y }, boxStart, currentPos))
        .map(p => p.id);
      
      if (isAdditive) {
        onPointsSelected([...new Set([...selectedPointIds, ...selectedIds])]);
      } else {
        onPointsSelected(selectedIds);
      }
    }

    setIsDrawing(false);
    setDrawingPath([]);
    setBoxStart(null);
    setCurrentPos(null);
  }, [isDrawing, drawingTool, drawingPath, boxStart, currentPos, points, selectedPointIds, isPointInPolygon, isPointInBox, onPointsSelected]);

  // Export functionality
  useImperativeHandle(ref, () => ({
    getSVGElement: () => svgRef.current,
    exportToDataURL: async (format: 'png' | 'svg', dpi: number) => {
      if (!svgRef.current) return '';

      if (format === 'svg') {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgRef.current);
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      }

      // PNG export using canvas
      const canvas = document.createElement('canvas');
      const scaleFactor = dpi / 96;
      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const img = new Image();
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        img.onload = () => {
          ctx.scale(scaleFactor, scaleFactor);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
      });
    },
  }), [width, height]);

  // Generate color legend gradient
  const legendGradientId = 'export-color-legend-gradient';

  // Drawing preview path
  const getDrawingPreviewPath = () => {
    if (drawingTool === 'lasso' && drawingPath.length >= 2) {
      const transformed = drawingPath.map(p => transformPoint(p.x, p.y));
      return transformed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
    }
    return '';
  };

  const getDrawingPreviewRect = () => {
    if (drawingTool === 'box' && boxStart && currentPos) {
      const p1 = transformPoint(boxStart.x, boxStart.y);
      const p2 = transformPoint(currentPos.x, currentPos.y);
      return {
        x: Math.min(p1.cx, p2.cx),
        y: Math.min(p1.cy, p2.cy),
        width: Math.abs(p2.cx - p1.cx),
        height: Math.abs(p2.cy - p1.cy),
      };
    }
    return null;
  };

  const cursor = drawingTool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/30 p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full max-h-full border border-border shadow-lg"
        style={{ 
          background: settings.background === 'transparent' ? 'transparent' : 
                      settings.background === 'custom' ? settings.customBackgroundColor : 'white',
          cursor,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id={legendGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={getColorForValue(minValue, minValue, maxValue, colorScheme)} />
            <stop offset="25%" stopColor={getColorForValue(minValue + (maxValue - minValue) * 0.25, minValue, maxValue, colorScheme)} />
            <stop offset="50%" stopColor={getColorForValue(minValue + (maxValue - minValue) * 0.5, minValue, maxValue, colorScheme)} />
            <stop offset="75%" stopColor={getColorForValue(minValue + (maxValue - minValue) * 0.75, minValue, maxValue, colorScheme)} />
            <stop offset="100%" stopColor={getColorForValue(maxValue, minValue, maxValue, colorScheme)} />
          </linearGradient>
        </defs>

        {/* Title */}
        {settings.showTitle && (
          <text
            x={margin.left + plotWidth / 2}
            y={30}
            textAnchor="middle"
            fontSize={settings.titleFontSize}
            fontWeight="bold"
            fontFamily="sans-serif"
            fill="#1f2937"
          >
            {settings.customTitle || `${propertyLabel} = f(x, y)`}
          </text>
        )}

        {/* Plot area background */}
        <rect
          x={margin.left}
          y={margin.top}
          width={plotWidth}
          height={plotHeight}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* X-axis */}
        {settings.showAxisLabels && (
          <>
            <line
              x1={margin.left}
              y1={margin.top + plotHeight}
              x2={margin.left + plotWidth}
              y2={margin.top + plotHeight}
              stroke="#374151"
              strokeWidth="1.5"
            />
            {xTicks.map((tick, i) => {
              const { cx } = transformPoint(tick, yMin);
              return (
                <g key={`x-tick-${i}`}>
                  <line
                    x1={cx}
                    y1={margin.top + plotHeight}
                    x2={cx}
                    y2={margin.top + plotHeight + 6}
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={margin.top + plotHeight + 20}
                    textAnchor="middle"
                    fontSize={settings.tickFontSize}
                    fontFamily="sans-serif"
                    fill="#4b5563"
                  >
                    {tick.toFixed(settings.axisDecimals)}
                  </text>
                </g>
              );
            })}
            <text
              x={margin.left + plotWidth / 2}
              y={height - 15}
              textAnchor="middle"
              fontSize={settings.axisLabelFontSize}
              fontFamily="sans-serif"
              fill="#1f2937"
            >
              {settings.xAxisLabel}
            </text>
          </>
        )}

        {/* Y-axis */}
        {settings.showAxisLabels && (
          <>
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
              stroke="#374151"
              strokeWidth="1.5"
            />
            {yTicks.map((tick, i) => {
              const { cy } = transformPoint(xMin, tick);
              return (
                <g key={`y-tick-${i}`}>
                  <line
                    x1={margin.left - 6}
                    y1={cy}
                    x2={margin.left}
                    y2={cy}
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 10}
                    y={cy + 4}
                    textAnchor="end"
                    fontSize={settings.tickFontSize}
                    fontFamily="sans-serif"
                    fill="#4b5563"
                  >
                    {tick.toFixed(settings.axisDecimals)}
                  </text>
                </g>
              );
            })}
            <text
              x={20}
              y={margin.top + plotHeight / 2}
              textAnchor="middle"
              fontSize={settings.axisLabelFontSize}
              fontFamily="sans-serif"
              fill="#1f2937"
              transform={`rotate(-90 20 ${margin.top + plotHeight / 2})`}
            >
              {settings.yAxisLabel}
            </text>
          </>
        )}

        {/* Data points */}
        <g>
          {normalizedPoints.map(point => {
            const isSelected = selectedPointIds.includes(point.id);
            return (
              <circle
                key={point.id}
                cx={point.cx}
                cy={point.cy}
                r={isSelected ? pointRadius * 1.3 : pointRadius}
                fill={point.color}
                stroke={isSelected ? '#3b82f6' : '#374151'}
                strokeWidth={isSelected ? 2 : 0.5}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>

        {/* Zones */}
        {settings.showZones && zones.filter(z => z.visible).map(zone => {
          const isSelected = zone.id === selectedZoneId;
          
          if (zone.type === 'ellipse') {
            const attrs = getZoneEllipseAttrs(zone, transformPoint, scaleX);
            if (!attrs) return null;
            
            const centroid = getZoneCentroid(zone);
            const labelPos = transformPoint(centroid.x, centroid.y);
            
            return (
              <g key={zone.id} onClick={() => onZoneSelect(zone.id)} style={{ cursor: 'pointer' }}>
                <ellipse
                  cx={attrs.cx}
                  cy={attrs.cy}
                  rx={attrs.rx}
                  ry={attrs.ry}
                  transform={attrs.transform}
                  fill={zone.color}
                  fillOpacity={zone.fillOpacity}
                  stroke={isSelected ? '#000' : zone.color}
                  strokeWidth={isSelected ? zone.borderWidth + 1 : zone.borderWidth}
                  strokeDasharray={getZoneDashArray(zone.borderStyle)}
                />
                {settings.showZoneLabels && zone.showLabel && (
                  <text
                    x={labelPos.cx}
                    y={labelPos.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={zone.labelFontSize}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    fill="#1f2937"
                    stroke="white"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {zone.name}
                  </text>
                )}
              </g>
            );
          }

          const path = getZoneSVGPath(zone, transformPoint);
          if (!path) return null;

          const centroid = getZoneCentroid(zone);
          const labelPos = transformPoint(centroid.x, centroid.y);

          return (
            <g key={zone.id} onClick={() => onZoneSelect(zone.id)} style={{ cursor: 'pointer' }}>
              <path
                d={path}
                fill={zone.color}
                fillOpacity={zone.fillOpacity}
                stroke={isSelected ? '#000' : zone.color}
                strokeWidth={isSelected ? zone.borderWidth + 1 : zone.borderWidth}
                strokeDasharray={getZoneDashArray(zone.borderStyle)}
              />
              {settings.showZoneLabels && zone.showLabel && (
                <text
                  x={labelPos.cx}
                  y={labelPos.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={zone.labelFontSize}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  fill="#1f2937"
                  stroke="white"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {zone.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Selection preview boundary */}
        {selectionPreviewPath && !isDrawing && (
          <path
            d={selectionPreviewPath}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="8 4"
            pointerEvents="none"
          />
        )}

        {/* Drawing preview */}
        {isDrawing && (
          <>
            {drawingTool === 'lasso' && (
              <path
                d={getDrawingPreviewPath()}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
            )}
            {drawingTool === 'box' && (() => {
              const rect = getDrawingPreviewRect();
              return rect && (
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="rgba(59, 130, 246, 0.2)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              );
            })()}
          </>
        )}

        {/* Color legend */}
        {settings.showColorLegend && (
          <g transform={`translate(${width - 90}, ${margin.top})`}>
            <rect
              x={0}
              y={0}
              width={20}
              height={plotHeight}
              fill={`url(#${legendGradientId})`}
              stroke="#374151"
              strokeWidth="1"
            />
            {(() => {
              const legendTicks = settings.useCustomLegendTicks && settings.customLegendTicks
                ? parseCustomTicks(settings.customLegendTicks)
                : Array.from({ length: settings.legendTickCount + 1 }, (_, i) => 
                    minValue + (maxValue - minValue) * (i / settings.legendTickCount)
                  );
              return legendTicks.map((value, i) => {
                const t = (value - minValue) / (maxValue - minValue);
                const y = plotHeight * (1 - Math.max(0, Math.min(1, t)));
                return (
                  <g key={i}>
                    <line x1={20} y1={y} x2={25} y2={y} stroke="#374151" strokeWidth="1" />
                    <text
                      x={28}
                      y={y + 4}
                      fontSize={settings.legendFontSize}
                      fontFamily="sans-serif"
                      fill="#4b5563"
                    >
                      {value.toFixed(settings.legendDecimals)}
                    </text>
                  </g>
                );
              });
            })()}
            <text
              x={10}
              y={-8}
              textAnchor="middle"
              fontSize={settings.legendFontSize}
              fontFamily="sans-serif"
              fill="#1f2937"
            >
              {settings.legendLabel || propertyUnit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});

ExportCanvas.displayName = 'ExportCanvas';
