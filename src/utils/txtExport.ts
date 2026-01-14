import { IndentationData } from '@/types/indentation';

// Reverse mappings: normalized key -> original header with units
export const REVERSE_HEADER_MAPPINGS: Record<string, string> = {
  'HIT': 'HIT [kPa]',
  'EIT': 'EIT [MPa]',
  'E*': 'E* [MPa]',
  'Er': 'Er [MPa]',
  'hmax': 'hmax [µm]',
  'hc': 'hc [µm]',
  'hp': 'hp [µm]',
  'hr': 'hr [µm]',
  'Fmax': 'Fmax [µN]',
  'S': 'S [µN/µm]',
  'Wtotal': 'Wtotal [pJ]',
  'Welast': 'Welast [pJ]',
  'Wplast': 'Wplast [pJ]',
  'nIT': 'nIT [%]',
  'CIT': 'CIT [%]',
  'RIT': 'RIT [%]',
  'Ap': 'Ap [µm²]',
  'X': 'X position [mm]',
  'Y': 'Y position [mm]',
  'Z': 'Z position [mm]',
  'Temperature': 'Temperature [°C]',
  'HVIT': 'HVIT [Vickers]',
  'Epsilon': 'Epsilon',
  'PoissonRatio': "Poisson's ratio (?)",
  'R2': 'R2',
  'm': 'm',
  'F/S2': 'F/S² [µm²/µN]',
};

/**
 * Convert normalized header key back to original format with units
 */
function getOriginalHeader(normalizedKey: string): string {
  return REVERSE_HEADER_MAPPINGS[normalizedKey] || normalizedKey;
}

/**
 * Format number with appropriate precision
 */
function formatNumber(value: number, isCoordinate = false): string {
  if (isNaN(value) || value === undefined) return '';
  
  // Coordinates typically have more decimal places
  if (isCoordinate) {
    return value.toFixed(6);
  }
  
  // For other values, use appropriate precision
  const absVal = Math.abs(value);
  if (absVal === 0) return '0';
  if (absVal >= 1000) return value.toFixed(2);
  if (absVal >= 1) return value.toFixed(4);
  if (absVal >= 0.01) return value.toFixed(6);
  return value.toExponential(4);
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Export indentation data to original TXT format (tab-separated)
 */
export function exportToOriginalTxtFormat(data: IndentationData, filename?: string): void {
  const { points, propertyNames } = data;
  
  // Build header row with original format
  const headers = [
    '', // First column for measurement label
    getOriginalHeader('X'),
    getOriginalHeader('Y'),
    getOriginalHeader('Z'),
    ...propertyNames.map(getOriginalHeader),
  ];
  
  // Build data rows
  const dataRows = points.map((point, index) => {
    const row = [
      `Measurement ${index + 1}`,
      formatNumber(point.x, true),
      formatNumber(point.y, true),
      formatNumber(point.z, true),
      ...propertyNames.map(prop => formatNumber(point.properties[prop] ?? NaN)),
    ];
    return row.join('\t');
  });
  
  // Calculate statistics for each column
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const zValues = points.map(p => p.z);
  
  const getStats = (values: number[]) => {
    const validValues = values.filter(v => !isNaN(v));
    if (validValues.length === 0) return { min: NaN, max: NaN, mean: NaN, stdDev: NaN, median: NaN };
    
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance = validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validValues.length;
    const stdDev = Math.sqrt(variance);
    const median = calculateMedian(validValues);
    
    return { min, max, mean, stdDev, median };
  };
  
  const xStats = getStats(xValues);
  const yStats = getStats(yValues);
  const zStats = getStats(zValues);
  
  const propStats = propertyNames.map(prop => {
    const values = points.map(p => p.properties[prop]).filter(v => v !== undefined);
    return getStats(values);
  });
  
  // Build summary rows
  const summaryRows = [
    ['Min', formatNumber(xStats.min, true), formatNumber(yStats.min, true), formatNumber(zStats.min, true), ...propStats.map(s => formatNumber(s.min))],
    ['Max', formatNumber(xStats.max, true), formatNumber(yStats.max, true), formatNumber(zStats.max, true), ...propStats.map(s => formatNumber(s.max))],
    ['Mean', formatNumber(xStats.mean, true), formatNumber(yStats.mean, true), formatNumber(zStats.mean, true), ...propStats.map(s => formatNumber(s.mean))],
    ['Std dev', formatNumber(xStats.stdDev, true), formatNumber(yStats.stdDev, true), formatNumber(zStats.stdDev, true), ...propStats.map(s => formatNumber(s.stdDev))],
    ['Median', formatNumber(xStats.median, true), formatNumber(yStats.median, true), formatNumber(zStats.median, true), ...propStats.map(s => formatNumber(s.median))],
    ['N', points.length.toString(), points.length.toString(), points.length.toString(), ...propStats.map(() => points.length.toString())],
  ];
  
  // Combine all parts
  const content = [
    headers.join('\t'),
    ...dataRows,
    '', // Empty line before summary
    ...summaryRows.map(row => row.join('\t')),
  ].join('\n');
  
  // Download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `indentation_data_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
