import * as XLSX from 'xlsx';
import { IndentationData, IndentationPoint } from '@/types/indentation';
import { minOf, maxOf } from './numeric';

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

/**
 * Detect the column delimiter.
 *
 * The uploader accepts .csv and .tsv, but this parser previously split on '\t'
 * unconditionally — so a genuine comma-separated export either threw
 * "Could not find header row" or parsed every row into a single column.
 * We pick whichever candidate yields the most consistent column count across
 * the first few populated lines.
 */
function detectDelimiter(lines: string[]): string {
  const candidates = ['\t', ',', ';'];
  let best = '\t';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines
      .slice(0, 15)
      .map(l => l.split(delim).length)
      .filter(n => n > 1);

    if (counts.length === 0) continue;

    // Favour delimiters that split into many columns, consistently
    const maxCols = Math.max(...counts);
    const consistent = counts.filter(n => n === maxCols).length;
    const score = maxCols * consistent;

    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

/**
 * Some exports place two (or more) measurement series side by side: every
 * property column is repeated once per series, and a label row under the
 * header names each series (e.g. "Lateral" / "Medial", or the older
 * "Calibration" / "Matrix" pairing).
 *
 * Returns the label row index plus the distinct series labels, or null when
 * the file is an ordinary single-series table.
 */
function findSeriesLabelRow(
  lines: string[],
  headerLineIndex: number,
  delimiter: string
): { index: number; labels: string[]; cells: string[] } | null {
  for (let i = headerLineIndex + 1; i < Math.min(lines.length, headerLineIndex + 6); i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    const values = cells.slice(1).filter(c => c !== '');
    if (values.length < 2) continue;

    // A label row is text-only (numeric rows are data or summary statistics)
    if (values.some(c => !isNaN(parseFloat(c)))) continue;

    const distinct = [...new Set(values)];
    // Rows like "Oliver & Pharr" repeated across all columns carry no series info
    if (distinct.length < 2) continue;

    return { index: i, labels: distinct, cells };
  }
  return null;
}

interface SeriesPlan {
  label: string | null;
  headers: string[];
  columnIndexMap: number[];
}

function buildSeriesPlans(
  rawHeaders: string[],
  labelRow: { labels: string[]; cells: string[] } | null
): SeriesPlan[] {
  if (!labelRow) {
    const headers = rawHeaders.map(normalizeHeader);
    return [{ label: null, headers, columnIndexMap: headers.map((_, i) => i) }];
  }

  // Legacy Calibration/Matrix exports: only the Matrix column holds real data
  const isCalibrationMatrix =
    labelRow.labels.includes('Calibration') && labelRow.labels.includes('Matrix');
  const labels = isCalibrationMatrix ? ['Matrix'] : labelRow.labels;

  return labels.map(label => {
    const headers: string[] = [];
    const columnIndexMap: number[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < rawHeaders.length; i++) {
      const header = normalizeHeader(rawHeaders[i]);
      if (!header || seen.has(header)) continue;

      const cellLabel = labelRow.cells[i] || '';
      if (cellLabel === label) {
        seen.add(header);
        headers.push(header);
        columnIndexMap.push(i);
      } else if (cellLabel === '') {
        // Unlabelled column (e.g. row index) is shared by every series
        seen.add(header);
        headers.push(header);
        columnIndexMap.push(i);
      }
    }

    return { label, headers, columnIndexMap };
  });
}

const SKIP_KEYWORDS = ['Min', 'Max', 'Mean', 'Std dev', 'Median', 'N', 'Oliver', '3rd try', 'Setting', 'Calibration', 'Matrix'];

function extractPoints(
  lines: string[],
  dataStartIndex: number,
  delimiter: string,
  plan: SeriesPlan,
  startId: number
): IndentationPoint[] {
  const { headers, columnIndexMap } = plan;
  const xIdx = headers.findIndex(h => h === 'X');
  const yIdx = headers.findIndex(h => h === 'Y');
  const zIdx = headers.findIndex(h => h === 'Z');

  if (xIdx === -1 || yIdx === -1) {
    throw new Error('Could not find X and Y position columns');
  }

  const points: IndentationPoint[] = [];
  let id = startId;

  for (let i = dataStartIndex; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());

    const firstCell = cells[0] || '';
    const secondCell = cells[1] || '';
    const checkCell = firstCell || secondCell;

    if (SKIP_KEYWORDS.some(keyword => checkCell.includes(keyword))) continue;
    if (cells.every(c => c === '')) continue;

    const isMeasurementRow =
      firstCell.includes('Measurement') ||
      /^\d+$/.test(firstCell) ||
      (firstCell === '' && !isNaN(parseFloat(secondCell)) && !secondCell.includes('Setting'));

    if (!isMeasurementRow) continue;

    const x = parseFloat(cells[columnIndexMap[xIdx]]);
    const y = parseFloat(cells[columnIndexMap[yIdx]]);
    const z = zIdx !== -1 ? parseFloat(cells[columnIndexMap[zIdx]]) : 0;

    if (isNaN(x) || isNaN(y)) continue;

    const properties: Record<string, number> = {};
    headers.forEach((header, effectiveIdx) => {
      if (header && !['X', 'Y', 'Z', ''].includes(header)) {
        const val = parseFloat(cells[columnIndexMap[effectiveIdx]]);
        if (!isNaN(val)) {
          properties[header] = val;
        }
      }
    });

    points.push({ id: id++, x, y, z, properties: { ...properties, ...(isNaN(z) ? {} : {}) } });
  }

  return points;
}

export function parseTabSeparatedData(content: string): IndentationData {
  // Strip a UTF-8 BOM and normalise CRLF — both appear in Windows exports
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').filter(line => line.trim());

  const delimiter = detectDelimiter(lines);

  // Find header line (contains column names)
  let headerLineIndex = -1;
  let rawHeaders: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    if (cells.some(c => c.includes('X position') || c.includes('HIT'))) {
      headerLineIndex = i;
      rawHeaders = cells;
      break;
    }
  }

  if (headerLineIndex === -1) {
    throw new Error('Could not find header row in data file');
  }

  const labelRow = findSeriesLabelRow(lines, headerLineIndex, delimiter);
  const plans = buildSeriesPlans(rawHeaders, labelRow);
  const dataStartIndex = labelRow ? labelRow.index + 1 : headerLineIndex + 1;

  // Side-by-side series are merged into a single dataset: each series
  // contributes its own measurement points, all pooled into one point cloud.
  const points: IndentationPoint[] = [];
  for (const plan of plans) {
    points.push(...extractPoints(lines, dataStartIndex, delimiter, plan, points.length));
  }

  const headers = [...new Set(plans.flatMap(p => p.headers).filter(Boolean))];
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

    min[prop] = minOf(values);
    max[prop] = maxOf(values);
    mean[prop] = values.reduce((a, b) => a + b, 0) / values.length;

    // Sample standard deviation (n-1), consistent with advancedStatistics.ts
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[prop], 2), 0) /
      Math.max(1, values.length - 1);
    stdDev[prop] = Math.sqrt(variance);
  });

  // Also calculate for coordinates
  ['X', 'Y', 'Z'].forEach((coord) => {
    const values = points.map((p) => coord === 'X' ? p.x : coord === 'Y' ? p.y : p.z);
    min[coord] = minOf(values);
    max[coord] = maxOf(values);
    mean[coord] = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[coord], 2), 0) /
      Math.max(1, values.length - 1);
    stdDev[coord] = Math.sqrt(variance);
  });

  return { min, max, mean, stdDev };
}
