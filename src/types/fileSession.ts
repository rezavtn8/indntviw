import { IndentationData, ColorScheme } from './indentation';
import { Zone } from './zones';
import {
  OverlayTransform,
  OverlayPointSettings,
  PointsTransform,
  OverlayActiveLayer,
  DEFAULT_OVERLAY_TRANSFORM,
  DEFAULT_OVERLAY_POINT_SETTINGS,
  DEFAULT_POINTS_TRANSFORM,
} from '@/components/visualization/OverlayCanvas';

export interface FileSession {
  id: string;
  fileName: string;
  data: IndentationData;
  originalData: IndentationData;
  // Per-file visualization settings
  selectedProperty: string;
  colorScheme: ColorScheme;
  customMin: number | null;
  customMax: number | null;
  // Per-file zones and selection
  zones: Zone[];
  selectedZoneId: string | null;
  comparedZoneIds: string[];
  selectedPointIds: number[];
  highlightedOutliers: number[];
  exportSelectedPointIds: number[];
  // Per-file overlay settings
  overlayImageDataUrl: string | null;
  overlayTransform: OverlayTransform;
  overlayPointSettings: OverlayPointSettings;
  overlayPointsTransform: PointsTransform;
  overlayActiveLayer: OverlayActiveLayer;
  overlayPointsVisible: boolean;
}

export const createFileSession = (
  id: string,
  fileName: string,
  data: IndentationData
): FileSession => {
  const defaultProperty = data.propertyNames.find(p => p === 'HIT') || data.propertyNames[0] || '';
  
  return {
    id,
    fileName,
    data,
    originalData: data,
    selectedProperty: defaultProperty,
    colorScheme: 'viridis',
    customMin: null,
    customMax: null,
    zones: [],
    selectedZoneId: null,
    comparedZoneIds: [],
    selectedPointIds: [],
    highlightedOutliers: [],
    exportSelectedPointIds: [],
    overlayImageDataUrl: null,
    overlayTransform: DEFAULT_OVERLAY_TRANSFORM,
    overlayPointSettings: DEFAULT_OVERLAY_POINT_SETTINGS,
    overlayPointsTransform: DEFAULT_POINTS_TRANSFORM,
    overlayActiveLayer: 'points',
    overlayPointsVisible: true,
  };
};

export const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
