export interface IndentationPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  properties: Record<string, number>;
}

export interface IndentationData {
  points: IndentationPoint[];
  headers: string[];
  propertyNames: string[];
  statistics: {
    min: Record<string, number>;
    max: Record<string, number>;
    mean: Record<string, number>;
    stdDev: Record<string, number>;
  };
}

export interface PropertyConfig {
  key: string;
  label: string;
  unit: string;
}

export const PROPERTY_CONFIGS: PropertyConfig[] = [
  { key: 'HIT', label: 'Hardness (HIT)', unit: 'kPa' },
  { key: 'EIT', label: 'Indentation Modulus (EIT)', unit: 'MPa' },
  { key: 'Er', label: 'Reduced Modulus (Er)', unit: 'MPa' },
  { key: 'E*', label: 'Plane Strain Modulus (E*)', unit: 'MPa' },
  { key: 'hmax', label: 'Max Depth (hmax)', unit: 'µm' },
  { key: 'hc', label: 'Contact Depth (hc)', unit: 'µm' },
  { key: 'Fmax', label: 'Max Force (Fmax)', unit: 'µN' },
  { key: 'S', label: 'Stiffness (S)', unit: 'µN/µm' },
  { key: 'Wtotal', label: 'Total Work (Wtotal)', unit: 'pJ' },
  { key: 'Welast', label: 'Elastic Work (Welast)', unit: 'pJ' },
  { key: 'Wplast', label: 'Plastic Work (Wplast)', unit: 'pJ' },
  { key: 'nIT', label: 'Elastic Recovery (nIT)', unit: '%' },
  { key: 'CIT', label: 'Creep (CIT)', unit: '%' },
];

export type ColorScheme = 'viridis' | 'plasma' | 'inferno' | 'magma' | 'turbo' | 'jet';
