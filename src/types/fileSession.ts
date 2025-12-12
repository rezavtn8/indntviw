import { IndentationData, ColorScheme } from './indentation';
import { Zone } from './zones';

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
  };
};

export const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
