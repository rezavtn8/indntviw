export type ZoneShape = 'freeform' | 'ellipse' | 'rectangle';

export interface ZonePoint {
  x: number;
  y: number;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneShape;
  points: ZonePoint[]; // For freeform paths
  // For ellipse/rectangle
  centerX?: number;
  centerY?: number;
  radiusX?: number;
  radiusY?: number;
  rotation?: number;
  // Style
  color: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderWidth: number;
  fillOpacity: number;
  labelFontSize: number;
  showLabel: boolean;
  visible: boolean;
}

export interface ZoneStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export interface ExportSettings {
  format: 'png' | 'svg' | 'pdf';
  dpi: number;
  width: number;
  height: number;
  background: 'white' | 'transparent' | 'custom';
  customBackgroundColor?: string;
  showZones: boolean;
  showZoneLabels: boolean;
  showColorLegend: boolean;
  showAxisLabels: boolean;
  showTitle: boolean;
  customTitle?: string;
}

export const DEFAULT_ZONE_COLORS = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'png',
  dpi: 300,
  width: 1200,
  height: 900,
  background: 'white',
  showZones: true,
  showZoneLabels: true,
  showColorLegend: true,
  showAxisLabels: true,
  showTitle: true,
};

export const createDefaultZone = (id: string, colorIndex: number): Zone => ({
  id,
  name: `Zone ${colorIndex + 1}`,
  type: 'freeform',
  points: [],
  color: DEFAULT_ZONE_COLORS[colorIndex % DEFAULT_ZONE_COLORS.length],
  borderStyle: 'solid',
  borderWidth: 2,
  fillOpacity: 0.25,
  labelFontSize: 14,
  showLabel: true,
  visible: true,
});
