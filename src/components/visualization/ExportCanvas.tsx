import React, { useMemo, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { IndentationPoint, ColorScheme, PROPERTY_CONFIGS } from '@/types/indentation';
import { Zone, ZonePoint, ExportSettings } from '@/types/zones';
import { getColorForValue } from '@/utils/colorScales';
import { getZoneDashArray, getZoneCentroid } from '@/utils/zoneUtils';
import { generateZoneBoundary, boundaryToSVGPath } from '@/utils/boundaryGenerator';
import { generateBoundaryContour, generateSmoothBoundaryPath } from '@/utils/contourGenerator';
import { isPointInPolygon } from '@/utils/statisticsUtils';
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
  onZoneSelect,
  onPointsSelected,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<ZonePoint[]>([]);
  const [boxStart, setBoxStart] = useState<ZonePoint | null>(null);
  const [currentPos, setCurrentPos] = useState<ZonePoint | null>(null);

  // Canvas dimensions with proper margins for labels
  // Increase right margin when zone labels are positioned outside
  const visibleZonesCount = zones.filter(z => z.visible && z.showLabel).length;
  const legendLabelsSpace = settings.zoneLabelPosition === 'legend' && settings.showZoneLabels && settings.showZones
    ? Math.max(80, visibleZonesCount * 22 + 30) 
    : 0;
  const margin = { top: 60, right: 100 + legendLabelsSpace, bottom: 60, left: 70 };
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

  // Fallback defaults for new properties
  const xStretch = settings.xStretch ?? 1.0;
  const yStretch = settings.yStretch ?? 1.0;
  const flipXAxis = settings.flipXAxis ?? false;
  const flipYAxis = settings.flipYAxis ?? false;

  // Transform data coordinates to SVG coordinates with stretch and flip
  const transformPoint = useCallback((x: number, y: number) => {
    // Calculate base position in plot space (without flip/stretch)
    const baseX = (x - xMin) * scaleX;
    const baseY = plotHeight - (y - yMin) * scaleY;
    
    // Apply flip (mirror around center of plot)
    let flippedX = flipXAxis ? (plotWidth - baseX) : baseX;
    let flippedY = flipYAxis ? (plotHeight - baseY) : baseY;
    
    // Apply stretch from center of plot
    const centerX = plotWidth / 2;
    const centerY = plotHeight / 2;
    
    const stretchedX = centerX + (flippedX - centerX) * xStretch;
    const stretchedY = centerY + (flippedY - centerY) * yStretch;
    
    return {
      cx: margin.left + stretchedX,
      cy: margin.top + stretchedY,
    };
  }, [margin.left, margin.top, xMin, scaleX, scaleY, plotHeight, plotWidth, xStretch, yStretch, flipXAxis, flipYAxis]);

  // Inverse transform: SVG to data coordinates (accounts for stretch and flip)
  const inverseTransform = useCallback((cx: number, cy: number) => {
    // Reverse the stretch from center
    const centerX = plotWidth / 2;
    const centerY = plotHeight / 2;
    
    const svgX = cx - margin.left;
    const svgY = cy - margin.top;
    
    const unstretchedX = centerX + (svgX - centerX) / xStretch;
    const unstretchedY = centerY + (svgY - centerY) / yStretch;
    
    // Reverse the flip
    const unflippedX = flipXAxis ? (plotWidth - unstretchedX) : unstretchedX;
    const unflippedY = flipYAxis ? (plotHeight - unstretchedY) : unstretchedY;
    
    // Calculate data coordinates
    const x = xMin + unflippedX / scaleX;
    const y = yMin + (plotHeight - unflippedY) / scaleY;
    
    return { x, y };
  }, [margin.left, margin.top, xMin, scaleX, scaleY, plotHeight, plotWidth, xStretch, yStretch, flipXAxis, flipYAxis]);

  // Get SVG coordinates from mouse event
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement>): ZonePoint => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    // Account for preserveAspectRatio scaling
    const viewBoxWidth = width;
    const viewBoxHeight = height;
    const renderedWidth = rect.width;
    const renderedHeight = rect.height;
    
    // Calculate the actual scale and offset due to preserveAspectRatio="xMidYMin meet"
    const scaleRatio = Math.min(renderedWidth / viewBoxWidth, renderedHeight / viewBoxHeight);
    const scaledWidth = viewBoxWidth * scaleRatio;
    const scaledHeight = viewBoxHeight * scaleRatio;
    const offsetX = (renderedWidth - scaledWidth) / 2; // xMid centers horizontally
    const offsetY = 0; // yMin aligns to top
    
    // Convert mouse position to viewBox coordinates
    const svgX = ((e.clientX - rect.left - offsetX) / scaleRatio);
    const svgY = ((e.clientY - rect.top - offsetY) / scaleRatio);
    
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
        isSelected: selectedPointIds.includes(point.id),
      };
    });
  }, [points, selectedProperty, colorScheme, minValue, maxValue, transformPoint, selectedPointIds]);

  // Point radius based on density, with user multiplier
  const pointSizeMultiplier = settings.pointSize ?? 1.0;
  const pointRadius = useMemo(() => {
    if (points.length === 0) return 5 * pointSizeMultiplier;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const avgDistance = Math.sqrt((xRange * yRange) / points.length);
    const baseRadius = Math.max(3, Math.min(12, avgDistance * scaleX * 0.35));
    return baseRadius * pointSizeMultiplier;
  }, [points.length, xMin, xMax, yMin, yMax, scaleX, pointSizeMultiplier]);

  // Point radius in data units
  const pointRadiusDataUnits = useMemo(() => {
    return pointRadius / scaleX;
  }, [pointRadius, scaleX]);

  // Generate boundary contour for display
  const boundaryContour = useMemo(() => {
    if (points.length < 3) return [];
    return generateBoundaryContour(points);
  }, [points]);

  // Get property label
  const propertyLabel = useMemo(() => {
    const config = PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
    return config ? `${config.label}` : selectedProperty;
  }, [selectedProperty]);

  const propertyUnit = useMemo(() => {
    const config = PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
    return config?.unit || '';
  }, [selectedProperty]);

  // Generate preview boundary for selected points - now avoids unselected points
  const selectionPreviewPath = useMemo(() => {
    if (selectedPointIds.length < 1) return null;
    
    const selectedPoints = points.filter(p => selectedPointIds.includes(p.id));
    if (selectedPoints.length === 0) return null;
    
    const memberCoords: ZonePoint[] = selectedPoints.map(p => ({ x: p.x, y: p.y }));
    
    // Pass ALL points and selected IDs so the algorithm can avoid unselected dots
    const allPointCoords: ZonePoint[] = points.map(p => ({ x: p.x, y: p.y }));
    const selectedIdxSet = new Set<number>();
    points.forEach((p, idx) => {
      if (selectedPointIds.includes(p.id)) {
        selectedIdxSet.add(idx);
      }
    });
    
    const boundaryPoints = generateZoneBoundary(
      memberCoords, 
      0.1, 
      0.5, 
      'concave', 
      pointRadiusDataUnits,
      allPointCoords,
      selectedIdxSet
    );
    
    if (boundaryPoints.length < 3) return null;
    
    return boundaryToSVGPath(boundaryPoints, transformPoint);
  }, [selectedPointIds, points, transformPoint, pointRadiusDataUnits]);

  // Helper to check if point is in box
  const isPointInBox = useCallback((point: { x: number; y: number }, start: ZonePoint, end: ZonePoint): boolean => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }, []);

  // Drawing handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingTool === 'select') {
      const coords = getSVGCoords(e);
      const clickedPoint = points.find(p => {
        const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
        return dist < pointRadiusDataUnits * 2;
      });
      
      if (clickedPoint) {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl) {
          if (selectedPointIds.includes(clickedPoint.id)) {
            onPointsSelected(selectedPointIds.filter(id => id !== clickedPoint.id));
          } else {
            onPointsSelected([...selectedPointIds, clickedPoint.id]);
          }
        } else {
          onPointsSelected([clickedPoint.id]);
        }
      } else {
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
  }, [drawingTool, getSVGCoords, points, pointRadiusDataUnits, selectedPointIds, onPointsSelected, onZoneSelect]);

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
      const selectedIds = points
        .filter(p => isPointInPolygon({ x: p.x, y: p.y }, drawingPath))
        .map(p => p.id);
      
      if (isAdditive) {
        onPointsSelected([...new Set([...selectedPointIds, ...selectedIds])]);
      } else {
        onPointsSelected(selectedIds);
      }
    } else if (drawingTool === 'box' && boxStart && currentPos) {
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
  }, [isDrawing, drawingTool, drawingPath, boxStart, currentPos, points, selectedPointIds, isPointInBox, onPointsSelected]);

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

  const legendGradientId = 'export-color-legend-gradient';

  // Drawing preview path
  const getDrawingPreviewPath = useCallback(() => {
    if (drawingTool === 'lasso' && drawingPath.length >= 2) {
      const transformed = drawingPath.map(p => transformPoint(p.x, p.y));
      return transformed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
    }
    return '';
  }, [drawingTool, drawingPath, transformPoint]);

  const getDrawingPreviewRect = useCallback(() => {
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
  }, [drawingTool, boxStart, currentPos, transformPoint]);

  const cursor = drawingTool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="w-full h-full flex items-start justify-center overflow-auto select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMin meet"
        className="w-full max-h-[calc(100vh-180px)] border border-border shadow-lg"
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

        {/* Boundary contour line (optional) */}
        {settings.showBoundaryContour && boundaryContour.length >= 3 && (
          <path
            d={generateSmoothBoundaryPath(
              boundaryContour.map(p => {
                const { cx, cy } = transformPoint(p.x, p.y);
                return { x: cx, y: cy };
              }),
              pointRadius * 1.1
            )}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        {/* Zone fills ONLY - rendered behind points */}
        {settings.showZones && zones.filter(z => z.visible).map(zone => {
          const isSelected = zone.id === selectedZoneId;
          
          // Get member points for this zone
          const memberPoints = zone.memberPointIds.length > 0
            ? points.filter(p => zone.memberPointIds.includes(p.id))
            : [];
          
          if (memberPoints.length === 0) return null;
          
          // Generate smooth boundary path (same logic as boundary contour)
          const zonePath = generateSmoothBoundaryPath(
            memberPoints.map(p => {
              const { cx, cy } = transformPoint(p.x, p.y);
              return { x: cx, y: cy };
            }),
            pointRadius * 1.1
          );
          
          if (!zonePath) return null;

          return (
            <g key={`zone-fill-${zone.id}`}>
              <path
                d={zonePath}
                fill={zone.color}
                fillOpacity={zone.fillOpacity}
                stroke={isSelected ? 'hsl(var(--foreground))' : zone.color}
                strokeWidth={isSelected ? zone.borderWidth + 1 : zone.borderWidth}
                strokeDasharray={getZoneDashArray(zone.borderStyle)}
                strokeLinejoin="round"
                className="cursor-pointer transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoneSelect?.(isSelected ? null : zone.id);
                }}
              />
              
              {isSelected && (
                <path
                  d={zonePath}
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  className="pointer-events-none animate-pulse"
                />
              )}
            </g>
          );
        })}

        {/* Data points */}
        <g>
          {normalizedPoints.map(point => {
            const isSelected = point.isSelected;
            return (
              <g key={point.id}>
                {isSelected && (
                  <circle
                    cx={point.cx}
                    cy={point.cy}
                    r={pointRadius * 1.3}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                )}
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={isSelected ? pointRadius * 1.3 : pointRadius}
                  fill={point.color}
                  stroke={isSelected ? '#3b82f6' : '#374151'}
                  strokeWidth={isSelected ? 2 : 0.5}
                  className="cursor-pointer"
                />
              </g>
            );
          })}
        </g>

        {/* Zone labels - rendered ON TOP of points */}
        {settings.showZones && settings.showZoneLabels && (() => {
          const visibleLabeledZones = zones.filter(z => z.visible && z.showLabel);
          
          if (settings.zoneLabelPosition === 'legend') {
            // Render a clean legend to the right of the plot
            const legendX = margin.left + plotWidth + 15;
            const baseY = margin.top + 20;
            const itemHeight = 22;
            
            return (
              <g>
                {visibleLabeledZones.map((zone, zoneIndex) => {
                  const memberPoints = zone.memberPointIds.length > 0
                    ? points.filter(p => zone.memberPointIds.includes(p.id))
                    : [];
                  
                  if (memberPoints.length === 0) return null;
                  
                  const itemY = baseY + zoneIndex * itemHeight;
                  const labelColor = settings.zoneLabelColor === 'zone' ? zone.color : '#1f2937';
                  
                  return (
                    <g key={`zone-legend-${zone.id}`}>
                      {/* Color swatch */}
                      <rect
                        x={legendX}
                        y={itemY - 6}
                        width={12}
                        height={12}
                        rx={2}
                        fill={zone.color}
                        stroke="#374151"
                        strokeWidth="0.5"
                        fillOpacity={0.8}
                      />
                      {/* Zone name */}
                      <text
                        x={legendX + 18}
                        y={itemY}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize={zone.labelFontSize}
                        fontWeight="500"
                        fontFamily="sans-serif"
                        fill={labelColor}
                      >
                        {zone.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          } else if (settings.zoneLabelPosition === 'edge') {
            // Render labels just outside each zone's boundary
            return visibleLabeledZones.map((zone) => {
              const memberPoints = zone.memberPointIds.length > 0
                ? points.filter(p => zone.memberPointIds.includes(p.id))
                : [];
              
              if (memberPoints.length === 0) return null;
              
              // Find the topmost point of the zone and place label just above it
              const memberCoords = memberPoints.map(p => ({ x: p.x, y: p.y }));
              const topPoint = memberCoords.reduce((top, p) => p.y > top.y ? p : top, memberCoords[0]);
              const centerX = memberCoords.reduce((sum, p) => sum + p.x, 0) / memberCoords.length;
              
              // Position label above the top of the zone
              const labelPos = transformPoint(centerX, topPoint.y + pointRadiusDataUnits * 2);
              const labelColor = settings.zoneLabelColor === 'zone' ? zone.color : '#1f2937';
              
              return (
                <g key={`zone-label-${zone.id}`}>
                  <text
                    x={labelPos.cx}
                    y={labelPos.cy - 8}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fontSize={zone.labelFontSize}
                    fontWeight="600"
                    fontFamily="sans-serif"
                    fill={labelColor}
                    stroke="white"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {zone.name}
                  </text>
                </g>
              );
            });
          } else {
            // Render labels at zone centroid (center position)
            return visibleLabeledZones.map((zone) => {
              const memberPoints = zone.memberPointIds.length > 0
                ? points.filter(p => zone.memberPointIds.includes(p.id))
                : [];
              
              if (memberPoints.length === 0) return null;
              
              const centroid = getZoneCentroid(zone, points);
              const labelPos = transformPoint(centroid.x, centroid.y);
              const labelColor = settings.zoneLabelColor === 'zone' ? zone.color : '#1f2937';
              
              return (
                <g key={`zone-label-${zone.id}`}>
                  <text
                    x={labelPos.cx}
                    y={labelPos.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={zone.labelFontSize}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    fill={labelColor}
                    stroke="white"
                    strokeWidth="3"
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {zone.name}
                  </text>
                </g>
              );
            });
          }
        })()}
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
            {/* Label at top */}
            <text
              x={10}
              y={-10}
              textAnchor="middle"
              fontSize={settings.legendFontSize}
              fontFamily="sans-serif"
              fill="#1f2937"
            >
              {settings.legendLabel || `${propertyLabel}${propertyUnit ? `(${propertyUnit})` : ''}`}
            </text>
            
            {/* Gradient bar */}
            <rect
              x={0}
              y={0}
              width={20}
              height={plotHeight}
              fill={`url(#${legendGradientId})`}
              stroke="#374151"
              strokeWidth="1"
            />
            
            {/* Tick marks and labels */}
            {(() => {
              // Generate nice round ticks
              const generateNiceTicks = (min: number, max: number, targetCount: number = 5): number[] => {
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
                
                const niceMin = Math.ceil(min / niceStep) * niceStep;
                const ticks: number[] = [];
                
                for (let tick = niceMin; tick <= max + niceStep * 0.01; tick += niceStep) {
                  if (tick >= min && tick <= max) {
                    ticks.push(Math.round(tick / niceStep) * niceStep);
                  }
                }
                
                return ticks.length > 0 ? ticks : [min, max];
              };

              // Format to show integers when appropriate
              const formatLegendValue = (value: number, ticks: number[]): string => {
                const allIntegers = ticks.every(t => Math.abs(t - Math.round(t)) < 0.0001);
                if (allIntegers) return Math.round(value).toString();
                if (Math.abs(value) >= 100) return value.toFixed(0);
                if (Math.abs(value) >= 1) return value.toFixed(1);
                return value.toFixed(2);
              };

              const legendTicks = settings.useCustomLegendTicks && settings.customLegendTicks
                ? parseCustomTicks(settings.customLegendTicks)
                : generateNiceTicks(minValue, maxValue, settings.legendTickCount);

              return legendTicks.map((value, i) => {
                const t = (value - minValue) / (maxValue - minValue);
                const y = plotHeight * (1 - Math.max(0, Math.min(1, t)));
                return (
                  <g key={i}>
                    {/* Horizontal tick line */}
                    <line x1={20} y1={y} x2={28} y2={y} stroke="#374151" strokeWidth="1" />
                    {/* Tick label */}
                    <text
                      x={32}
                      y={y + 4}
                      fontSize={settings.legendFontSize}
                      fontFamily="sans-serif"
                      fill="#4b5563"
                    >
                      {formatLegendValue(value, legendTicks)}
                    </text>
                  </g>
                );
              });
            })()}
          </g>
        )}
      </svg>
    </div>
  );
});

ExportCanvas.displayName = 'ExportCanvas';
