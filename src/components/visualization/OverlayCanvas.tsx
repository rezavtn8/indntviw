import React, { useMemo, useCallback, useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';
import { BRAND } from '@/components/layout/Brand';
import { Plus, Minus, Maximize2, Square, ImagePlus } from 'lucide-react';

export interface OverlayTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface OverlayPointSettings {
  sizeMultiplier: number;
  opacity: number;
}

export type OverlayActiveLayer = 'image' | 'points';

export interface PointsTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
  xStretch: number;
  yStretch: number;
}

export const DEFAULT_OVERLAY_TRANSFORM: OverlayTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  opacity: 80,
};

export const DEFAULT_OVERLAY_POINT_SETTINGS: OverlayPointSettings = {
  sizeMultiplier: 1,
  opacity: 90,
};

export const DEFAULT_POINTS_TRANSFORM: PointsTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  opacity: 90,
  xStretch: 1,
  yStretch: 1,
};

interface OverlayCanvasProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  imageUrl: string | null;
  transform: OverlayTransform;
  onTransformChange: (t: OverlayTransform) => void;
  pointSettings: OverlayPointSettings;
  pointsTransform: PointsTransform;
  onPointsTransformChange: (t: PointsTransform) => void;
  activeLayer: OverlayActiveLayer;
  onActiveLayerChange: (l: OverlayActiveLayer) => void;
  containerWidth: number;
  containerHeight: number;
  pointsVisible?: boolean;
  onRequestUploadImage?: () => void;
}

export interface OverlayCanvasRef {
  exportToDataURL: (format: 'png' | 'svg', dpi: number) => Promise<string>;
  fitImageToData: () => void;
  centerImage: () => void;
  centerPoints: () => void;
  getCanvasDimensions: () => { width: number; height: number };
}

const HANDLE_SIZE = 10;
const HANDLE_HIT_SIZE = 16;

type DragMode = 'none' | 'move-image' | 'move-points' | 'resize-image' | 'resize-points' | 'pan';

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  startScale: number;
  handleCorner: number; // 0=TL 1=TR 2=BR 3=BL
  anchorX: number;
  anchorY: number;
}

export const OverlayCanvas = forwardRef<OverlayCanvasRef, OverlayCanvasProps>(({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  imageUrl,
  transform,
  onTransformChange,
  pointSettings,
  pointsTransform,
  onPointsTransformChange,
  activeLayer,
  onActiveLayerChange,
  containerWidth,
  containerHeight,
  pointsVisible = true,
  onRequestUploadImage,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number>(0);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const prevImageUrlRef = useRef<string | null>(imageUrl);

  // Refs to avoid stale closures
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  const pointsTransformRef = useRef(pointsTransform);
  useEffect(() => { pointsTransformRef.current = pointsTransform; }, [pointsTransform]);
  const onTransformChangeRef = useRef(onTransformChange);
  useEffect(() => { onTransformChangeRef.current = onTransformChange; }, [onTransformChange]);
  const onPointsTransformChangeRef = useRef(onPointsTransformChange);
  useEffect(() => { onPointsTransformChangeRef.current = onPointsTransformChange; }, [onPointsTransformChange]);

  const width = containerWidth || 800;
  const height = containerHeight || 600;

  // Load image dimensions
  useEffect(() => {
    if (!imageUrl) { setImageDimensions(null); return; }
    const img = new Image();
    img.onload = () => setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Data bounds
  const dataBounds = useMemo(() => {
    if (points.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of points) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    return { xMin, xMax, yMin, yMax };
  }, [points]);

  const margin = 40;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const xRange = dataBounds.xMax - dataBounds.xMin || 1;
  const yRange = dataBounds.yMax - dataBounds.yMin || 1;
  const scaleX = plotWidth / xRange;
  const scaleY = plotHeight / yRange;

  // Colored points data
  const coloredPoints = useMemo(() => {
    const centerX = margin + plotWidth / 2;
    const centerY = margin + plotHeight / 2;
    const xs = pointsTransform.xStretch ?? 1;
    const ys = pointsTransform.yStretch ?? 1;
    return points.map(p => {
      const val = p.properties[selectedProperty] ?? 0;
      const baseCx = margin + (p.x - dataBounds.xMin) * scaleX;
      const baseCy = margin + plotHeight - (p.y - dataBounds.yMin) * scaleY;
      const cx = centerX + (baseCx - centerX) * xs;
      const cy = centerY + (baseCy - centerY) * ys;
      return { cx, cy, color: getColorForValue(val, minValue, maxValue, colorScheme) };
    });
  }, [points, selectedProperty, colorScheme, minValue, maxValue, dataBounds, scaleX, scaleY, plotHeight, plotWidth, margin, pointsTransform.xStretch, pointsTransform.yStretch]);

  // Point radius
  const pointRadius = useMemo(() => {
    if (points.length === 0) return 5;
    const avgDist = Math.sqrt((xRange * yRange) / points.length);
    return Math.max(2, Math.min(10, avgDist * scaleX * 0.35)) * pointSettings.sizeMultiplier;
  }, [points.length, xRange, yRange, scaleX, pointSettings.sizeMultiplier]);

  // Points bounding box (in canvas coords, before points transform)
  const pointsBBox = useMemo(() => {
    if (coloredPoints.length === 0) return { x: margin, y: margin, w: plotWidth, h: plotHeight };
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of coloredPoints) {
      if (p.cx - pointRadius < x1) x1 = p.cx - pointRadius;
      if (p.cy - pointRadius < y1) y1 = p.cy - pointRadius;
      if (p.cx + pointRadius > x2) x2 = p.cx + pointRadius;
      if (p.cy + pointRadius > y2) y2 = p.cy + pointRadius;
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }, [coloredPoints, pointRadius, margin, plotWidth, plotHeight]);

  // Image bounding box (in scene coords)
  const imageBBox = useMemo(() => {
    if (!imageDimensions) return null;
    const w = imageDimensions.w * transform.scale;
    const h = imageDimensions.h * transform.scale;
    const cx = width / 2 + transform.offsetX;
    const cy = height / 2 + transform.offsetY;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [imageDimensions, transform.scale, transform.offsetX, transform.offsetY, width, height]);

  // Points layer bounding box (after transform applied)
  const pointsLayerBBox = useMemo(() => {
    const s = pointsTransform.scale;
    const ox = pointsTransform.offsetX;
    const oy = pointsTransform.offsetY;
    return {
      x: pointsBBox.x * s + ox,
      y: pointsBBox.y * s + oy,
      w: pointsBBox.w * s,
      h: pointsBBox.h * s,
    };
  }, [pointsBBox, pointsTransform]);

  // Fit / Center helpers
  const fitImageToData = useCallback(() => {
    if (!imageDimensions) return;
    const scaleToFitX = plotWidth / imageDimensions.w;
    const scaleToFitY = plotHeight / imageDimensions.h;
    const fitScale = Math.min(scaleToFitX, scaleToFitY);
    onTransformChangeRef.current({ ...transformRef.current, scale: fitScale, offsetX: 0, offsetY: 0, rotation: 0 });
  }, [imageDimensions, plotWidth, plotHeight]);

  const centerImage = useCallback(() => {
    onTransformChangeRef.current({ ...transformRef.current, offsetX: 0, offsetY: 0 });
  }, []);

  const centerPoints = useCallback(() => {
    onPointsTransformChangeRef.current({ ...pointsTransformRef.current, offsetX: 0, offsetY: 0 });
  }, []);

  // Auto-fit on first image upload
  useEffect(() => {
    if (imageUrl && imageDimensions && prevImageUrlRef.current !== imageUrl) {
      prevImageUrlRef.current = imageUrl;
      requestAnimationFrame(() => fitImageToData());
    }
    if (!imageUrl) {
      prevImageUrlRef.current = null;
    }
  }, [imageUrl, imageDimensions, fitImageToData]);

  // Draw points onto canvas (dynamically sized to fit stretched points)
  useEffect(() => {
    const canvas = pointsCanvasRef.current;
    if (!canvas) return;
    if (coloredPoints.length === 0) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      return;
    }
    // Compute actual bounds of all points
    let minX = 0, minY = 0, maxX = width, maxY = height;
    for (const p of coloredPoints) {
      minX = Math.min(minX, p.cx - pointRadius - 2);
      minY = Math.min(minY, p.cy - pointRadius - 2);
      maxX = Math.max(maxX, p.cx + pointRadius + 2);
      maxY = Math.max(maxY, p.cy + pointRadius + 2);
    }
    const cw = Math.ceil(maxX - minX);
    const ch = Math.ceil(maxY - minY);
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.left = `${minX}px`;
    canvas.style.top = `${minY}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = (pointSettings.opacity / 100) * (pointsTransform.opacity / 100);
    for (const p of coloredPoints) {
      ctx.beginPath();
      ctx.arc(p.cx - minX, p.cy - minY, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }, [coloredPoints, pointRadius, pointSettings.opacity, pointsTransform.opacity, width, height]);

  // Apply view transform
  const applyViewTransform = useCallback(() => {
    if (!sceneRef.current) return;
    const { x, y, zoom } = viewRef.current;
    sceneRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  }, []);

  // Get corners of a bounding box
  const getCorners = (bbox: { x: number; y: number; w: number; h: number }) => [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.w, y: bbox.y },
    { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
    { x: bbox.x, y: bbox.y + bbox.h },
  ];

  // Hit test handle
  const hitTestHandle = (mx: number, my: number, bbox: { x: number; y: number; w: number; h: number }): number => {
    const corners = getCorners(bbox);
    const zoom = viewRef.current.zoom;
    const hs = HANDLE_HIT_SIZE / zoom;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(mx - corners[i].x) < hs && Math.abs(my - corners[i].y) < hs) return i;
    }
    return -1;
  };

  // Hit test bbox interior
  const hitTestBBox = (mx: number, my: number, bbox: { x: number; y: number; w: number; h: number }): boolean => {
    return mx >= bbox.x && mx <= bbox.x + bbox.w && my >= bbox.y && my <= bbox.y + bbox.h;
  };

  // Convert mouse event to scene coordinates
  const toSceneCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { x: vx, y: vy, zoom } = viewRef.current;
    return {
      x: (e.clientX - rect.left - vx) / zoom,
      y: (e.clientY - rect.top - vy) / zoom,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    // Alt+click = pan
    if (e.altKey) {
      dragRef.current = {
        mode: 'pan', startX: e.clientX - viewRef.current.x, startY: e.clientY - viewRef.current.y,
        startOffsetX: 0, startOffsetY: 0, startScale: 1, handleCorner: -1, anchorX: 0, anchorY: 0,
      };
      return;
    }

    const sc = toSceneCoords(e);

    // Check handles on active layer first
    if (activeLayer === 'image' && imageBBox) {
      const h = hitTestHandle(sc.x, sc.y, imageBBox);
      if (h >= 0) {
        const corners = getCorners(imageBBox);
        const anchor = corners[(h + 2) % 4]; // opposite corner
        dragRef.current = {
          mode: 'resize-image', startX: e.clientX, startY: e.clientY,
          startOffsetX: transformRef.current.offsetX, startOffsetY: transformRef.current.offsetY,
          startScale: transformRef.current.scale, handleCorner: h, anchorX: anchor.x, anchorY: anchor.y,
        };
        return;
      }
    }
    if (activeLayer === 'points' && pointsLayerBBox) {
      const h = hitTestHandle(sc.x, sc.y, pointsLayerBBox);
      if (h >= 0) {
        const corners = getCorners(pointsLayerBBox);
        const anchor = corners[(h + 2) % 4];
        dragRef.current = {
          mode: 'resize-points', startX: e.clientX, startY: e.clientY,
          startOffsetX: pointsTransformRef.current.offsetX, startOffsetY: pointsTransformRef.current.offsetY,
          startScale: pointsTransformRef.current.scale, handleCorner: h, anchorX: anchor.x, anchorY: anchor.y,
        };
        return;
      }
    }

    // Check click on layers (active layer has priority)
    const checkOrder: OverlayActiveLayer[] = activeLayer === 'image' ? ['image', 'points'] : ['points', 'image'];
    for (const layer of checkOrder) {
      if (layer === 'image' && imageBBox && hitTestBBox(sc.x, sc.y, imageBBox)) {
        onActiveLayerChange('image');
        dragRef.current = {
          mode: 'move-image', startX: e.clientX, startY: e.clientY,
          startOffsetX: transformRef.current.offsetX, startOffsetY: transformRef.current.offsetY,
          startScale: 1, handleCorner: -1, anchorX: 0, anchorY: 0,
        };
        return;
      }
      if (layer === 'points' && hitTestBBox(sc.x, sc.y, pointsLayerBBox)) {
        onActiveLayerChange('points');
        dragRef.current = {
          mode: 'move-points', startX: e.clientX, startY: e.clientY,
          startOffsetX: pointsTransformRef.current.offsetX, startOffsetY: pointsTransformRef.current.offsetY,
          startScale: 1, handleCorner: -1, anchorX: 0, anchorY: 0,
        };
        return;
      }
    }
  }, [activeLayer, imageBBox, pointsLayerBBox, onActiveLayerChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;

    const zoom = viewRef.current.zoom || 1;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;

    if (d.mode === 'pan') {
      viewRef.current.x = e.clientX - d.startX; // startX already stores offset
      viewRef.current.y = e.clientY - d.startY;
      // recalc: startX = e.clientX_initial - viewRef.x_initial, so viewRef.x = e.clientX - startX
      applyViewTransform();
      return;
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (d.mode === 'move-image') {
        onTransformChangeRef.current({ ...transformRef.current, offsetX: d.startOffsetX + dx, offsetY: d.startOffsetY + dy });
      } else if (d.mode === 'move-points') {
        onPointsTransformChangeRef.current({ ...pointsTransformRef.current, offsetX: d.startOffsetX + dx, offsetY: d.startOffsetY + dy });
      } else if (d.mode === 'resize-image') {
        // Proportional resize based on diagonal distance from anchor
        const sc = toSceneCoords(e);
        const startSc = { x: d.anchorX + (d.startX - d.startX), y: d.anchorY }; // not used directly
        const distNow = Math.sqrt((sc.x - d.anchorX) ** 2 + (sc.y - d.anchorY) ** 2);
        // Original distance from anchor to the drag corner
        const origBBox = imageBBox!;
        const corners = getCorners(origBBox);
        const dragCorner = corners[d.handleCorner];
        const distOrig = Math.sqrt((dragCorner.x - d.anchorX) ** 2 + (dragCorner.y - d.anchorY) ** 2);
        if (distOrig > 0) {
          const ratio = distNow / distOrig;
          const newScale = Math.max(0.05, d.startScale * ratio);
          onTransformChangeRef.current({ ...transformRef.current, scale: newScale });
        }
      } else if (d.mode === 'resize-points') {
        const sc = toSceneCoords(e);
        const distNow = Math.sqrt((sc.x - d.anchorX) ** 2 + (sc.y - d.anchorY) ** 2);
        const corners = getCorners(pointsLayerBBox);
        const dragCorner = corners[d.handleCorner];
        const distOrig = Math.sqrt((dragCorner.x - d.anchorX) ** 2 + (dragCorner.y - d.anchorY) ** 2);
        if (distOrig > 0) {
          const ratio = distNow / distOrig;
          const newScale = Math.max(0.05, d.startScale * ratio);
          onPointsTransformChangeRef.current({ ...pointsTransformRef.current, scale: newScale });
        }
      }
    });
  }, [applyViewTransform, imageBBox, pointsLayerBBox]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      viewRef.current.zoom = Math.max(0.1, Math.min(10, viewRef.current.zoom * delta));
      applyViewTransform();
    }
  }, [applyViewTransform]);

  // Image CSS transform
  const imageStyle = useMemo((): React.CSSProperties => {
    if (!imageDimensions) return {};
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 'auto',
      height: 'auto',
      maxWidth: 'none',
      maxHeight: 'none',
      objectFit: 'contain' as const,
      transform: `translate(-50%, -50%) translate(${transform.offsetX}px, ${transform.offsetY}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
      opacity: transform.opacity / 100,
      pointerEvents: 'none' as const,
      willChange: 'transform',
    };
  }, [imageDimensions, transform]);

  // Points wrapper CSS transform
  const pointsWrapperStyle = useMemo((): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    transformOrigin: '0 0',
    transform: `translate(${pointsTransform.offsetX}px, ${pointsTransform.offsetY}px) scale(${pointsTransform.scale})`,
    pointerEvents: 'none' as const,
    willChange: 'transform',
  }), [pointsTransform, width, height]);

  // Render selection boxes as SVG overlay
  const renderSelectionOverlay = () => {
    const zoom = viewRef.current.zoom || 1;
    const hs = HANDLE_SIZE / zoom;

    const renderBBox = (bbox: { x: number; y: number; w: number; h: number }, color: string, isActive: boolean) => {
      const corners = getCorners(bbox);
      return (
        <g key={color}>
          <rect
            x={bbox.x} y={bbox.y} width={bbox.w} height={bbox.h}
            fill="none" stroke={color} strokeWidth={isActive ? 2 / zoom : 1 / zoom}
            strokeDasharray={isActive ? 'none' : `${4 / zoom}`}
          />
          {isActive && corners.map((c, i) => (
            <rect
              key={i}
              x={c.x - hs / 2} y={c.y - hs / 2} width={hs} height={hs}
              fill={color} stroke="hsl(var(--background))" strokeWidth={1 / zoom}
              style={{ cursor: 'nwse-resize' }}
            />
          ))}
        </g>
      );
    };

    return (
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none', overflow: 'visible' }}
      >
        {/* Points layer box */}
        {points.length > 0 && renderBBox(pointsLayerBBox, 'hsl(142, 76%, 46%)', activeLayer === 'points')}
        {/* Image layer box */}
        {imageBBox && renderBBox(imageBBox, 'hsl(217, 91%, 60%)', activeLayer === 'image')}
      </svg>
    );
  };

  // Export
  useImperativeHandle(ref, () => ({
    fitImageToData,
    centerImage,
    centerPoints,
    getCanvasDimensions: () => ({ width, height }),
    exportToDataURL: async (format, dpi) => {
      // Convert blob/object URL to data URL via XHR+FileReader for reliable export
      let imageDataUrl: string | null = null;
      if (imageUrl && imageDimensions) {
        try {
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', imageUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
              if (xhr.status === 200) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(xhr.response);
              } else {
                reject(new Error('Failed to fetch image blob'));
              }
            };
            xhr.onerror = reject;
            xhr.send();
          });
        } catch {
          // If conversion fails, skip image in export
        }
      }

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.setAttribute('xmlns', svgNs);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const bg = document.createElementNS(svgNs, 'rect');
      bg.setAttribute('width', String(width));
      bg.setAttribute('height', String(height));
      bg.setAttribute('fill', 'white');
      svg.appendChild(bg);

      if (imageDataUrl && imageDimensions) {
        const g = document.createElementNS(svgNs, 'g');
        const cx = width / 2 + transform.offsetX;
        const cy = height / 2 + transform.offsetY;
        g.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${transform.rotation}) scale(${transform.scale}) translate(${-imageDimensions.w / 2}, ${-imageDimensions.h / 2})`);
        g.setAttribute('opacity', String(transform.opacity / 100));
        const img = document.createElementNS(svgNs, 'image');
        img.setAttribute('href', imageDataUrl);
        img.setAttribute('width', String(imageDimensions.w));
        img.setAttribute('height', String(imageDimensions.h));
        g.appendChild(img);
        svg.appendChild(g);
      }

      const pg = document.createElementNS(svgNs, 'g');
      pg.setAttribute('opacity', String((pointSettings.opacity / 100) * (pointsTransform.opacity / 100)));
      pg.setAttribute('transform', `translate(${pointsTransform.offsetX}, ${pointsTransform.offsetY}) scale(${pointsTransform.scale})`);
      for (const p of coloredPoints) {
        const c = document.createElementNS(svgNs, 'circle');
        c.setAttribute('cx', String(p.cx));
        c.setAttribute('cy', String(p.cy));
        c.setAttribute('r', String(pointRadius));
        c.setAttribute('fill', p.color);
        c.setAttribute('stroke', 'rgba(0,0,0,0.3)');
        c.setAttribute('stroke-width', '0.5');
        pg.appendChild(c);
      }
      svg.appendChild(pg);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      if (format === 'svg') {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      }

      const canvas = document.createElement('canvas');
      const sf = dpi / 96;
      canvas.width = width * sf;
      canvas.height = height * sf;
      const ctx = canvas.getContext('2d')!;
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return new Promise<string>(resolve => {
        const img = new Image();
        img.onload = () => {
          ctx.scale(sf, sf);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
      });
    },
  }), [width, height, imageUrl, imageDimensions, transform, pointSettings, pointsTransform, coloredPoints, pointRadius, fitImageToData, centerImage, centerPoints]);

  const cursorStyle = dragRef.current ? 'grabbing' : 'default';

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-muted/20 relative"
      style={{ cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        ref={sceneRef}
        style={{ width, height, position: 'relative', transformOrigin: '0 0', willChange: 'transform' }}
      >
        {imageUrl && imageDimensions && (
          <img src={imageUrl} alt="Overlay" style={imageStyle} draggable={false} />
        )}
        <div style={{ ...pointsWrapperStyle, display: pointsVisible === false ? 'none' : undefined }}>
          <canvas
            ref={pointsCanvasRef}
            width={width}
            height={height}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </div>
        {renderSelectionOverlay()}
      </div>

      {!imageUrl && points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground font-mono text-sm">
            Upload a microscope image and load data to begin
          </span>
        </div>
      )}

      {/* Layer switcher at bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border shadow-sm">
        <button
          onClick={(e) => { e.stopPropagation(); onActiveLayerChange('image'); }}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            activeLayer === 'image'
              ? 'bg-[hsl(217,91%,60%)] text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Image
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onActiveLayerChange('points'); }}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
            activeLayer === 'points'
              ? 'bg-[hsl(142,76%,46%)] text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Points
        </button>
      </div>

      <div className="absolute bottom-3 left-2 text-[10px] font-mono text-muted-foreground/60 pointer-events-none select-none">
        Click: select layer · Drag: move · Corners: resize · Alt+drag: pan
      </div>
    </div>
  );
});

OverlayCanvas.displayName = 'OverlayCanvas';
