import * as XLSX from 'xlsx';
import { IndentationData, IndentationPoint } from '@/types/indentation';

const HEADER_MAPPINGS: Record<string, string> = {
  'HIT [kPa]': 'HIT',
  'EIT [MPa]': 'EIT',
  'E* [MPa]': 'E*',
  'Er [MPa]': 'Er',
  'hmax [µm]': 'hmax',
  'hmax [�m]': 'hmax',
  'hc [µm]': 'hc',
  'hc [�m]': 'hc',
  'hp [µm]': 'hp',
  'hp [�m]': 'hp',
  'hr [µm]': 'hr',
  'hr [�m]': 'hr',
  'Fmax [µN]': 'Fmax',
  'Fmax [�N]': 'Fmax',
  'S [µN/µm]': 'S',
  'S [�N/�m]': 'S',
  'Wtotal [pJ]': 'Wtotal',
  'Welast [pJ]': 'Welast',
  'Wplast [pJ]': 'Wplast',
  'nIT [%]': 'nIT',
  'CIT [%]': 'CIT',
  'RIT [%]': 'RIT',
  'Ap [µm²]': 'Ap',
  'Ap [�m�]': 'Ap',
  'X position [mm]': 'X',
  'Y position [mm]': 'Y',
  'Z position [mm]': 'Z',
  'Temperature [°C]': 'Temperature',
  'Temperature [�C]': 'Temperature',
  'HVIT [Vickers]': 'HVIT',
  'Epsilon': 'Epsilon',
  "Poisson's ratio (?)": 'PoissonRatio',
  'R2': 'R2',
  'm': 'm',
  'F/S² [µm²/µN]': 'F/S2',
  'F/S� [�m�/�N]': 'F/S2',
};

function normalizeHeader(header: string): string {
  const trimmed = header.trim();
  return HEADER_MAPPINGS[trimmed] || trimmed;
}

export function parseTabSeparatedData(content: string): IndentationData {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Find header line (contains column names)
  let headerLineIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = lines[i].split('\t').map(c => c.trim());
    if (cells.some(c => c.includes('X position') || c.includes('HIT'))) {
      headerLineIndex = i;
      headers = cells.map(normalizeHeader);
      break;
    }
  }
  
  if (headerLineIndex === -1) {
    throw new Error('Could not find header row in data file');
  }

  // Find column indices
  const xIdx = headers.findIndex(h => h === 'X');
  const yIdx = headers.findIndex(h => h === 'Y');
  const zIdx = headers.findIndex(h => h === 'Z');
  
  if (xIdx === -1 || yIdx === -1) {
    throw new Error('Could not find X and Y position columns');
  }

  // Find data rows (skip summary rows like Min, Max, Mean, etc.)
  const points: IndentationPoint[] = [];
  const skipKeywords = ['Min', 'Max', 'Mean', 'Std dev', 'Median', 'N', 'Oliver', '3rd try', 'Setting'];
  
  let id = 0;
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t').map(c => c.trim());
    
    // Get the first non-empty cell for checking
    const firstCell = cells[0] || '';
    const secondCell = cells[1] || '';
    const checkCell = firstCell || secondCell;
    
    // Skip summary rows and metadata rows
    if (skipKeywords.some(keyword => checkCell.includes(keyword))) {
      continue;
    }
    
    // Skip empty rows
    if (cells.every(c => c === '')) {
      continue;
    }
    
    // Check if this is a measurement row - must start with "Measurement" 
    // OR have the first cell be a number (row index)
    // Also verify we have valid X and Y coordinates
    const isMeasurementRow = firstCell.includes('Measurement') || 
                              /^\d+$/.test(firstCell) ||
                              (firstCell === '' && !isNaN(parseFloat(secondCell)) && !secondCell.includes('Setting'));
    
    if (isMeasurementRow) {
      const x = parseFloat(cells[xIdx]);
      const y = parseFloat(cells[yIdx]);
      const z = zIdx !== -1 ? parseFloat(cells[zIdx]) : 0;
      
      // Skip if X or Y are not valid numbers
      if (isNaN(x) || isNaN(y)) continue;
      
      const properties: Record<string, number> = {};
      headers.forEach((header, idx) => {
        if (header && !['X', 'Y', 'Z', ''].includes(header)) {
          const val = parseFloat(cells[idx]);
          if (!isNaN(val)) {
            properties[header] = val;
          }
        }
      });
      
      points.push({ id: id++, x, y, z, properties });
    }
  }

  // Calculate statistics
  const propertyNames = headers.filter(h => h && !['X', 'Y', 'Z', ''].includes(h));
  const statistics = calculateStatistics(points, propertyNames);

  return {
    points,
    headers,
    propertyNames,
    statistics,
  };
}

export async function parseExcelFile(file: File): Promise<IndentationData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
        const result = parseTabSeparatedData(csv);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseTextFile(file: File): Promise<IndentationData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseTabSeparatedData(content);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function calculateStatistics(
  points: IndentationPoint[],
  propertyNames: string[]
): IndentationData['statistics'] {
  const min: Record<string, number> = {};
  const max: Record<string, number> = {};
  const mean: Record<string, number> = {};
  const stdDev: Record<string, number> = {};

  propertyNames.forEach((prop) => {
    const values = points
      .map((p) => p.properties[prop])
      .filter((v) => v !== undefined && !isNaN(v));

    if (values.length === 0) {
      min[prop] = 0;
      max[prop] = 0;
      mean[prop] = 0;
      stdDev[prop] = 0;
      return;
    }

    min[prop] = Math.min(...values);
    max[prop] = Math.max(...values);
    mean[prop] = values.reduce((a, b) => a + b, 0) / values.length;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[prop], 2), 0) / values.length;
    stdDev[prop] = Math.sqrt(variance);
  });

  // Also calculate for coordinates
  ['X', 'Y', 'Z'].forEach((coord) => {
    const values = points.map((p) => coord === 'X' ? p.x : coord === 'Y' ? p.y : p.z);
    min[coord] = Math.min(...values);
    max[coord] = Math.max(...values);
    mean[coord] = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[coord], 2), 0) / values.length;
    stdDev[coord] = Math.sqrt(variance);
  });

  return { min, max, mean, stdDev };
}
