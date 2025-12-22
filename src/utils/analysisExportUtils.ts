import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import JSZip from 'jszip';

export interface AnalysisData {
  name: string;
  color: string;
  values: number[];
  stats: DescriptiveStats;
}

export interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ReportOptions {
  title: string;
  author?: string;
  selectedProperty: string;
  quality: 'screen' | 'print';
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  includeRawData: boolean;
  includeSummary?: boolean;
}

const getPropertyLabel = (key: string): string => {
  const config = PROPERTY_CONFIGS.find(c => c.key === key);
  return config?.label || key;
};

const getPropertyUnit = (key: string): string => {
  const config = PROPERTY_CONFIGS.find(c => c.key === key);
  return config?.unit || '';
};

// Capture a DOM element as high-quality image
export async function captureElement(
  element: HTMLElement,
  quality: 'screen' | 'print' = 'print'
): Promise<string> {
  const scale = quality === 'print' ? 3 : 2;
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    logging: false,
    useCORS: true,
    allowTaint: true,
  });
  
  return canvas.toDataURL('image/png', 1.0);
}

// Export a single chart as PNG
export async function exportChartAsPNG(
  element: HTMLElement,
  filename: string,
  quality: 'screen' | 'print' = 'print'
): Promise<void> {
  const scale = quality === 'print' ? 3 : 2;
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    logging: false,
    useCORS: true,
  });
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format value for display
const formatValue = (val: number, decimals = 4): string => {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  if (val === 0) return '0';
  if (Math.abs(val) >= 10000) return val.toExponential(2);
  if (Math.abs(val) >= 1000) return val.toFixed(1);
  if (Math.abs(val) >= 1) return val.toFixed(decimals);
  return val.toFixed(decimals);
};

// Generate comprehensive PDF report
export async function generateAnalysisPDF(
  analysisData: AnalysisData[],
  chartElements: Map<string, HTMLElement>,
  options: ReportOptions
): Promise<void> {
  const { title, author, selectedProperty, quality, pageSize, orientation, includeRawData, includeSummary } = options;
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;
  
  const addNewPageIfNeeded = (requiredHeight: number): boolean => {
    if (yPos + requiredHeight > pageHeight - margin - 10) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  const drawSectionHeader = (text: string) => {
    addNewPageIfNeeded(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 33, 33);
    pdf.text(text, margin, yPos);
    yPos += 2;
    pdf.setDrawColor(66, 133, 244); // Blue accent line
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, margin + 50, yPos);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.line(margin + 50, yPos, pageWidth - margin, yPos);
    yPos += 8;
  };

  const drawSubHeader = (text: string) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(66, 66, 66);
    pdf.text(text, margin, yPos);
    yPos += 6;
  };
  
  // === Title Page Header ===
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(33, 33, 33);
  pdf.text(title || 'Analysis Report', margin, yPos);
  yPos += 10;
  
  // Decorative line
  pdf.setDrawColor(66, 133, 244);
  pdf.setLineWidth(1);
  pdf.line(margin, yPos, margin + 60, yPos);
  yPos += 8;
  
  // Property and metadata
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  const propLabel = getPropertyLabel(selectedProperty);
  const propUnit = getPropertyUnit(selectedProperty);
  pdf.text(`Property: ${propLabel}${propUnit ? ` (${propUnit})` : ''}`, margin, yPos);
  yPos += 6;
  
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  const dateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  pdf.text(`Generated: ${dateStr}`, margin, yPos);
  yPos += 5;
  
  if (author) {
    pdf.text(`Author: ${author}`, margin, yPos);
    yPos += 5;
  }
  
  pdf.text(`Zones Analyzed: ${analysisData.length}`, margin, yPos);
  yPos += 5;
  
  const totalPoints = analysisData.reduce((sum, d) => sum + d.stats.n, 0);
  pdf.text(`Total Data Points: ${totalPoints.toLocaleString()}`, margin, yPos);
  yPos += 12;
  
  // === Executive Summary (Optional) ===
  if (includeSummary && analysisData.length > 0) {
    drawSectionHeader('Executive Summary');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    
    // Calculate overall statistics
    const allValues = analysisData.flatMap(d => d.values);
    const overallMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const overallMin = Math.min(...allValues);
    const overallMax = Math.max(...allValues);
    
    // Find highest and lowest zones by mean
    const sortedByMean = [...analysisData].sort((a, b) => b.stats.mean - a.stats.mean);
    const highest = sortedByMean[0];
    const lowest = sortedByMean[sortedByMean.length - 1];
    
    const summaryLines = [
      `This report analyzes ${propLabel} across ${analysisData.length} zone${analysisData.length > 1 ? 's' : ''} containing ${totalPoints.toLocaleString()} total measurements.`,
      ``,
      `Overall Range: ${formatValue(overallMin, 2)} to ${formatValue(overallMax, 2)} ${propUnit}`,
      `Overall Mean: ${formatValue(overallMean, 2)} ${propUnit}`,
      ``,
    ];
    
    if (analysisData.length > 1) {
      summaryLines.push(`Highest Mean: "${highest.name}" (${formatValue(highest.stats.mean, 2)} ± ${formatValue(highest.stats.sem, 2)} ${propUnit})`);
      summaryLines.push(`Lowest Mean: "${lowest.name}" (${formatValue(lowest.stats.mean, 2)} ± ${formatValue(lowest.stats.sem, 2)} ${propUnit})`);
    }
    
    summaryLines.forEach(line => {
      pdf.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 5;
  }
  
  // === Descriptive Statistics Table ===
  drawSectionHeader('Descriptive Statistics');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(50, 50, 50);
  
  // Table headers with better spacing
  const statsHeaders = ['Zone', 'N', 'Mean', 'SD', 'SEM', '95% CI', 'Median', 'IQR', 'Min', 'Max'];
  const colWidths = orientation === 'landscape' 
    ? [35, 18, 25, 25, 22, 42, 25, 25, 22, 22]
    : [28, 14, 20, 20, 17, 34, 20, 20, 18, 18];
  
  // Header background
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos - 4, contentWidth, 6, 'F');
  
  let xPos = margin;
  statsHeaders.forEach((header, i) => {
    pdf.text(header, xPos + 1, yPos);
    xPos += colWidths[i];
  });
  yPos += 6;
  
  // Table rows with alternating backgrounds
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(33, 33, 33);
  
  analysisData.forEach((data, rowIdx) => {
    addNewPageIfNeeded(8);
    
    // Alternating row background
    if (rowIdx % 2 === 1) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos - 4, contentWidth, 6, 'F');
    }
    
    xPos = margin;
    const s = data.stats;
    const rowData = [
      data.name.substring(0, 15),
      s.n.toString(),
      formatValue(s.mean, 2),
      formatValue(s.sd, 2),
      formatValue(s.sem, 2),
      `[${formatValue(s.ci95Lower, 2)}, ${formatValue(s.ci95Upper, 2)}]`,
      formatValue(s.median, 2),
      formatValue(s.iqr, 2),
      formatValue(s.min, 2),
      formatValue(s.max, 2),
    ];
    
    rowData.forEach((cell, i) => {
      pdf.text(cell, xPos + 1, yPos);
      xPos += colWidths[i];
    });
    yPos += 6;
  });
  yPos += 8;
  
  // === Distribution Statistics ===
  drawSectionHeader('Distribution Characteristics');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  const distHeaders = ['Zone', 'Skewness', 'Kurtosis', 'CV (%)', 'Range', 'Q1', 'Q3'];
  const distColWidths = orientation === 'landscape'
    ? [45, 30, 30, 30, 30, 30, 30]
    : [35, 25, 25, 25, 25, 25, 25];
  
  // Header background
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPos - 4, contentWidth, 6, 'F');
  
  xPos = margin;
  distHeaders.forEach((header, i) => {
    pdf.text(header, xPos + 1, yPos);
    xPos += distColWidths[i];
  });
  yPos += 6;
  
  pdf.setFont('helvetica', 'normal');
  analysisData.forEach((data, rowIdx) => {
    addNewPageIfNeeded(8);
    
    if (rowIdx % 2 === 1) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPos - 4, contentWidth, 6, 'F');
    }
    
    xPos = margin;
    const s = data.stats;
    const rowData = [
      data.name.substring(0, 18),
      formatValue(s.skewness, 3),
      formatValue(s.kurtosis, 3),
      formatValue(s.cv, 2),
      formatValue(s.range, 2),
      formatValue(s.q1, 2),
      formatValue(s.q3, 2),
    ];
    
    rowData.forEach((cell, i) => {
      pdf.text(cell, xPos + 1, yPos);
      xPos += distColWidths[i];
    });
    yPos += 6;
  });
  yPos += 8;
  
  // === Chart Images ===
  const chartOrder = ['stats', 'boxplot', 'distribution', 'tests', 'correlation'];
  const chartLabels: Record<string, string> = {
    stats: 'Descriptive Statistics Summary',
    boxplot: 'Box Plot Comparison',
    distribution: 'Distribution Analysis',
    tests: 'Statistical Tests Results',
    correlation: 'Correlation Matrix',
  };
  
  for (const chartId of chartOrder) {
    const element = chartElements.get(chartId);
    if (!element) continue;
    
    try {
      const imgData = await captureElement(element, quality);
      
      // Calculate image dimensions
      const imgMaxWidth = contentWidth;
      const canvas = await html2canvas(element, { scale: 1 });
      const aspectRatio = canvas.height / canvas.width;
      let imgWidth = imgMaxWidth;
      let imgHeight = imgWidth * aspectRatio;
      
      // Cap height and ensure it fits on page
      const maxHeight = pageHeight * 0.55;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight / aspectRatio;
      }
      
      // New page for each major chart
      addNewPageIfNeeded(imgHeight + 25);
      drawSectionHeader(chartLabels[chartId] || chartId);
      
      // Add chart with border
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, yPos - 2, imgWidth + 4, imgHeight + 4);
      pdf.addImage(imgData, 'PNG', margin + 2, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 12;
    } catch (error) {
      console.error(`Failed to capture ${chartId}:`, error);
    }
  }
  
  // === Raw Data Sample (Optional) ===
  if (includeRawData && analysisData.length > 0) {
    pdf.addPage();
    yPos = margin;
    drawSectionHeader('Raw Data Sample');
    
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    
    analysisData.forEach((data) => {
      if (data.values.length === 0) return;
      
      addNewPageIfNeeded(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${data.name} (first 50 values):`, margin, yPos);
      yPos += 5;
      
      pdf.setFont('helvetica', 'normal');
      const sampleValues = data.values.slice(0, 50);
      const valuesPerRow = orientation === 'landscape' ? 12 : 8;
      
      for (let i = 0; i < sampleValues.length; i += valuesPerRow) {
        const row = sampleValues.slice(i, i + valuesPerRow).map(v => formatValue(v, 4)).join('  ');
        pdf.text(row, margin + 3, yPos);
        yPos += 4;
      }
      yPos += 6;
    });
  }
  
  // === Footer on all pages ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    
    // Page number centered
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    
    // Report title and date in footer
    pdf.setFontSize(7);
    pdf.text(title || 'Analysis Report', margin, pageHeight - 8);
    pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  
  // Save
  const safeTitle = (title || 'analysis_report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

// Generate ZIP of all charts as PNG
export async function exportChartsAsZIP(
  chartElements: Map<string, HTMLElement>,
  quality: 'screen' | 'print' = 'print',
  propertyName: string = 'analysis'
): Promise<void> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const scale = quality === 'print' ? 3 : 2;
  
  const chartLabels: Record<string, string> = {
    descriptive_stats: 'descriptive_statistics',
    box_violin_plot: 'box_violin_plot',
    distribution: 'distribution_analysis',
    statistical_tests: 'statistical_tests',
    correlation_matrix: 'correlation_matrix',
  };
  
  for (const [chartId, element] of chartElements) {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale,
        logging: false,
        useCORS: true,
      });
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
      });
      
      const filename = `${chartLabels[chartId] || chartId}_${propertyName}_${dateStr}.png`;
      zip.file(filename, blob);
    } catch (error) {
      console.error(`Failed to capture ${chartId}:`, error);
    }
  }
  
  // Generate and download ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.download = `analysis_charts_${propertyName}_${dateStr}.zip`;
  link.href = URL.createObjectURL(content);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
