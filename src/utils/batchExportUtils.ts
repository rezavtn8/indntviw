import jsPDF from 'jspdf';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { FileSession } from '@/types/fileSession';
import { getPropertyValues } from '@/utils/advancedStatistics';

export interface BatchExportOptions {
  title: string;
  author: string;
  property: string;
  propertyLabel: string;
  format: 'pdf' | 'zip' | 'both';
  quality: 'screen' | 'print';
  includeSections: {
    perSample: boolean;
    perSampleDistribution: boolean;
    perSampleZones: boolean;
    perSampleStats: boolean;
    crossSample: boolean;
    crossSamplePlots: boolean;
    crossSampleTests: boolean;
    treatmentGroups: boolean;
    smartZones: boolean;
    smartZonesCrossComparison: boolean;
    smartZonesPerZone: boolean;
    smartZonesTests: boolean;
  };
}

export interface ChartCapture {
  id: string;
  category: 'per_sample' | 'cross_sample' | 'treatment_groups' | 'smart_zones';
  subcategory: string;
  sampleName?: string;
  zoneName?: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface ExportProgress {
  stage: 'preparing' | 'capturing' | 'generating' | 'complete';
  current: number;
  total: number;
  message: string;
}

const QUALITY_SCALE = {
  screen: 1,
  print: 2
};

export async function captureChartElement(
  element: HTMLElement,
  quality: 'screen' | 'print' = 'print'
): Promise<{ dataUrl: string; width: number; height: number }> {
  const scale = QUALITY_SCALE[quality];
  
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true
  });
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  };
}

export async function generateBatchZIP(
  captures: ChartCapture[],
  options: BatchExportOptions,
  statsData?: string
): Promise<void> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const rootFolder = zip.folder(`export_${dateStr}_${options.property}`);
  
  if (!rootFolder) return;

  // Organize by category
  const categories = {
    '01_per_sample': captures.filter(c => c.category === 'per_sample'),
    '02_cross_sample': captures.filter(c => c.category === 'cross_sample'),
    '03_treatment_groups': captures.filter(c => c.category === 'treatment_groups'),
    '04_smart_zones': captures.filter(c => c.category === 'smart_zones')
  };

  for (const [folderName, categoryCaptures] of Object.entries(categories)) {
    if (categoryCaptures.length === 0) continue;
    
    const folder = rootFolder.folder(folderName);
    if (!folder) continue;

    for (const capture of categoryCaptures) {
      const fileName = generateFileName(capture);
      const base64Data = capture.dataUrl.split(',')[1];
      folder.file(fileName, base64Data, { base64: true });
    }
  }

  // Add statistics summary CSV if provided
  if (statsData) {
    rootFolder.file('statistics_summary.csv', statsData);
  }

  // Add metadata file
  const metadata = {
    title: options.title,
    author: options.author,
    property: options.propertyLabel,
    exportDate: new Date().toISOString(),
    quality: options.quality,
    chartCount: captures.length
  };
  rootFolder.file('export_metadata.json', JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `batch_export_${dateStr}_${options.property}.zip`);
}

export async function generateBatchPDF(
  captures: ChartCapture[],
  options: BatchExportOptions,
  statsData?: { category: string; rows: string[][] }[]
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Title page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.title || 'Batch Analysis Report', pageWidth / 2, 60, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Property: ${options.propertyLabel}`, pageWidth / 2, 80, { align: 'center' });
  
  if (options.author) {
    pdf.text(`Author: ${options.author}`, pageWidth / 2, 90, { align: 'center' });
  }
  
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 100, { align: 'center' });
  
  // Summary
  pdf.setFontSize(12);
  const perSampleCount = captures.filter(c => c.category === 'per_sample').length;
  const crossSampleCount = captures.filter(c => c.category === 'cross_sample').length;
  const groupCount = captures.filter(c => c.category === 'treatment_groups').length;
  const zoneCount = captures.filter(c => c.category === 'smart_zones').length;
  
  let yPos = 120;
  pdf.text('Report Contents:', margin, yPos);
  yPos += 8;
  if (perSampleCount > 0) {
    pdf.text(`• Per-Sample Analysis: ${perSampleCount} charts`, margin + 5, yPos);
    yPos += 6;
  }
  if (crossSampleCount > 0) {
    pdf.text(`• Cross-Sample Comparison: ${crossSampleCount} charts`, margin + 5, yPos);
    yPos += 6;
  }
  if (groupCount > 0) {
    pdf.text(`• Treatment Groups: ${groupCount} charts`, margin + 5, yPos);
    yPos += 6;
  }
  if (zoneCount > 0) {
    pdf.text(`• Smart Zone Analysis: ${zoneCount} charts`, margin + 5, yPos);
    yPos += 6;
  }

  // Add charts by category
  const categoryOrder = ['per_sample', 'cross_sample', 'treatment_groups', 'smart_zones'] as const;
  const categoryTitles = {
    per_sample: 'Per-Sample Analysis',
    cross_sample: 'Cross-Sample Comparison',
    treatment_groups: 'Treatment Group Analysis',
    smart_zones: 'Smart Zone Analysis'
  };

  for (const category of categoryOrder) {
    const categoryCaptures = captures.filter(c => c.category === category);
    if (categoryCaptures.length === 0) continue;

    // Category title page
    pdf.addPage();
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(categoryTitles[category], pageWidth / 2, 40, { align: 'center' });
    
    let currentY = 60;

    for (const capture of categoryCaptures) {
      // Calculate image dimensions to fit on page
      const aspectRatio = capture.width / capture.height;
      let imgWidth = contentWidth;
      let imgHeight = imgWidth / aspectRatio;
      
      // If too tall, scale down
      const maxHeight = pageHeight - margin * 2 - 30; // Leave room for caption
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }

      // Check if we need a new page
      if (currentY + imgHeight + 20 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }

      // Add chart
      const xOffset = (pageWidth - imgWidth) / 2;
      pdf.addImage(capture.dataUrl, 'PNG', xOffset, currentY, imgWidth, imgHeight);
      
      // Add caption
      currentY += imgHeight + 5;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      const caption = generateCaption(capture);
      pdf.text(caption, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 15;
    }
  }

  // Add statistics tables if provided
  if (statsData && statsData.length > 0) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Statistical Summary', pageWidth / 2, 20, { align: 'center' });
    
    let tableY = 35;
    
    for (const table of statsData) {
      if (tableY > pageHeight - 50) {
        pdf.addPage();
        tableY = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(table.category, margin, tableY);
      tableY += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      for (const row of table.rows) {
        if (tableY > pageHeight - 15) {
          pdf.addPage();
          tableY = 20;
        }
        pdf.text(row.join('  |  '), margin, tableY);
        tableY += 5;
      }
      
      tableY += 10;
    }
  }

  pdf.save(`batch_report_${new Date().toISOString().split('T')[0]}_${options.property}.pdf`);
}

function generateFileName(capture: ChartCapture): string {
  const parts: string[] = [];
  
  if (capture.sampleName) {
    parts.push(sanitizeFileName(capture.sampleName));
  }
  if (capture.zoneName) {
    parts.push(sanitizeFileName(capture.zoneName));
  }
  parts.push(capture.subcategory);
  
  return parts.join('_') + '.png';
}

function generateCaption(capture: ChartCapture): string {
  const parts: string[] = [];
  
  if (capture.sampleName) {
    parts.push(capture.sampleName);
  }
  if (capture.zoneName) {
    parts.push(`Zone: ${capture.zoneName}`);
  }
  
  const subcategoryLabels: Record<string, string> = {
    distribution: 'Distribution Plot',
    zones_boxplot: 'Zone Comparison',
    sample_comparison: 'Sample Comparison',
    statistical_tests: 'Statistical Tests',
    group_comparison: 'Group Comparison',
    cross_zone: 'Cross-Zone Comparison',
    zone_across_samples: 'Zone Across Samples'
  };
  
  parts.push(subcategoryLabels[capture.subcategory] || capture.subcategory);
  
  return parts.join(' - ');
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getPropertyLabel(key: string): string {
  const labels: Record<string, string> = {
    E_IT: 'Indentation Modulus E_IT',
    H_IT: 'Indentation Hardness H_IT',
    HIT: 'Indentation Hardness H_IT',
    EIT: 'Indentation Modulus E_IT',
    h_max: 'Maximum Depth h_max',
    h_c: 'Contact Depth h_c',
    h_r: 'Residual Depth h_r',
    F_max: 'Maximum Force F_max',
    S: 'Contact Stiffness S',
    A_p: 'Projected Contact Area A_p',
    epsilon: 'Strain ε',
    m: 'Power Law Exponent m',
    W_elast: 'Elastic Work W_elast',
    W_plast: 'Plastic Work W_plast',
    eta_IT: 'Elastic Ratio η_IT',
    H_V: 'Vickers Hardness H_V'
  };
  return labels[key] || key;
}

export function generateStatisticsCSV(
  fileSessions: FileSession[],
  property: string,
  groups?: { id: string; name: string; sessionIds: string[] }[]
): string {
  const lines: string[] = [];
  
  lines.push('Category,Sample/Zone,N,Mean,StdDev,Min,Max,Median');
  
  // Per-sample stats
  for (const session of fileSessions) {
    if (!session.data) continue;
    const values = getPropertyValues(session.data.points, property);
    if (values.length === 0) continue;
    
    const stats = calculateBasicStats(values);
    const sampleName = session.fileName.replace(/\.[^/.]+$/, '');
    lines.push(`Per-Sample,${sampleName},${stats.n},${stats.mean.toFixed(4)},${stats.std.toFixed(4)},${stats.min.toFixed(4)},${stats.max.toFixed(4)},${stats.median.toFixed(4)}`);
    
    // Zones within sample
    for (const zone of session.zones) {
      const zoneValues = session.data.points
        .filter(p => zone.memberPointIds.includes(p.id))
        .map(p => {
          const val = p[property as keyof typeof p] ?? p.properties[property];
          return typeof val === 'number' ? val : NaN;
        })
        .filter(v => !isNaN(v));
      
      if (zoneValues.length === 0) continue;
      const zoneStats = calculateBasicStats(zoneValues);
      lines.push(`Zone (${sampleName}),${zone.name},${zoneStats.n},${zoneStats.mean.toFixed(4)},${zoneStats.std.toFixed(4)},${zoneStats.min.toFixed(4)},${zoneStats.max.toFixed(4)},${zoneStats.median.toFixed(4)}`);
    }
  }
  
  // Group stats if groups exist
  if (groups && groups.length > 0) {
    for (const group of groups) {
      const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
      const allValues: number[] = [];
      
      for (const session of groupSessions) {
        if (!session.data) continue;
        const values = getPropertyValues(session.data.points, property);
        allValues.push(...values);
      }
      
      if (allValues.length === 0) continue;
      const groupStats = calculateBasicStats(allValues);
      lines.push(`Treatment Group,${group.name},${groupStats.n},${groupStats.mean.toFixed(4)},${groupStats.std.toFixed(4)},${groupStats.min.toFixed(4)},${groupStats.max.toFixed(4)},${groupStats.median.toFixed(4)}`);
    }
  }
  
  return lines.join('\n');
}

function calculateBasicStats(values: number[]): { n: number; mean: number; std: number; min: number; max: number; median: number } {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, std: 0, min: 0, max: 0, median: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  return { n, mean, std, min, max, median };
}
