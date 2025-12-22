import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';

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
  selectedProperty: string;
  quality: 'screen' | 'print';
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  includeRawData: boolean;
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
  const { title, selectedProperty, quality, pageSize, orientation, includeRawData } = options;
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  const drawSectionHeader = (text: string) => {
    addNewPageIfNeeded(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 33, 33);
    pdf.text(text, margin, yPos);
    yPos += 2;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
  };
  
  // === Title Page ===
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(33, 33, 33);
  pdf.text(title || 'Analysis Report', margin, yPos);
  yPos += 12;
  
  // Property and date
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const propLabel = getPropertyLabel(selectedProperty);
  const propUnit = getPropertyUnit(selectedProperty);
  pdf.text(`Property: ${propLabel}${propUnit ? ` (${propUnit})` : ''}`, margin, yPos);
  yPos += 6;
  pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPos);
  yPos += 6;
  pdf.text(`Zones Analyzed: ${analysisData.length}`, margin, yPos);
  yPos += 6;
  pdf.text(`Total Data Points: ${analysisData.reduce((sum, d) => sum + d.stats.n, 0).toLocaleString()}`, margin, yPos);
  yPos += 15;
  
  // === Descriptive Statistics Table ===
  drawSectionHeader('Descriptive Statistics');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Table headers
  const statsHeaders = ['Zone', 'N', 'Mean', 'SD', 'SEM', '95% CI', 'Median', 'IQR', 'Min', 'Max'];
  const colWidths = [30, 15, 22, 22, 18, 35, 22, 22, 20, 20];
  
  let xPos = margin;
  statsHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 5;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  analysisData.forEach((data) => {
    addNewPageIfNeeded(8);
    xPos = margin;
    const s = data.stats;
    const rowData = [
      data.name.substring(0, 12),
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
      pdf.text(cell, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 5;
  });
  yPos += 10;
  
  // === Additional Statistics ===
  drawSectionHeader('Distribution Statistics');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  const distHeaders = ['Zone', 'Skewness', 'Kurtosis', 'CV (%)', 'Range', 'Q1', 'Q3'];
  const distColWidths = [35, 25, 25, 25, 25, 25, 25];
  
  xPos = margin;
  distHeaders.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += distColWidths[i];
  });
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  analysisData.forEach((data) => {
    addNewPageIfNeeded(8);
    xPos = margin;
    const s = data.stats;
    const rowData = [
      data.name.substring(0, 15),
      formatValue(s.skewness, 3),
      formatValue(s.kurtosis, 3),
      formatValue(s.cv, 2),
      formatValue(s.range, 2),
      formatValue(s.q1, 2),
      formatValue(s.q3, 2),
    ];
    
    rowData.forEach((cell, i) => {
      pdf.text(cell, xPos, yPos);
      xPos += distColWidths[i];
    });
    yPos += 5;
  });
  yPos += 10;
  
  // === Chart Images ===
  const chartOrder = ['boxplot', 'distribution', 'tests', 'correlation'];
  const chartLabels: Record<string, string> = {
    boxplot: 'Box Plot Comparison',
    distribution: 'Distribution Analysis',
    tests: 'Statistical Tests',
    correlation: 'Correlation Matrix',
  };
  
  for (const chartId of chartOrder) {
    const element = chartElements.get(chartId);
    if (!element) continue;
    
    try {
      const imgData = await captureElement(element, quality);
      
      // Calculate image dimensions
      const imgWidth = pageWidth - margin * 2;
      const canvas = await html2canvas(element, { scale: 1 });
      const aspectRatio = canvas.height / canvas.width;
      let imgHeight = imgWidth * aspectRatio;
      
      // Cap height and handle page breaks
      imgHeight = Math.min(imgHeight, pageHeight * 0.6);
      
      addNewPageIfNeeded(imgHeight + 20);
      drawSectionHeader(chartLabels[chartId] || chartId);
      
      pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
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
    analysisData.forEach((data) => {
      if (data.values.length === 0) return;
      
      addNewPageIfNeeded(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${data.name} (first 50 values):`, margin, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      const sampleValues = data.values.slice(0, 50);
      const valuesPerRow = 10;
      
      for (let i = 0; i < sampleValues.length; i += valuesPerRow) {
        const row = sampleValues.slice(i, i + valuesPerRow).map(v => formatValue(v, 4)).join('  ');
        pdf.text(row, margin, yPos);
        yPos += 3;
      }
      yPos += 5;
    });
  }
  
  // === Footer on all pages ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
  
  // Save
  const filename = `${title || 'analysis_report'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename.replace(/[^a-zA-Z0-9_-]/g, '_'));
}

// Generate ZIP of all charts as PNG
export async function exportChartsAsZIP(
  chartElements: Map<string, HTMLElement>,
  quality: 'screen' | 'print' = 'print'
): Promise<void> {
  // For simplicity, we'll download each chart individually
  // In a production app, you'd use JSZip to bundle them
  const chartLabels: Record<string, string> = {
    boxplot: 'box_plot',
    distribution: 'distribution',
    tests: 'statistical_tests',
    correlation: 'correlation_matrix',
  };
  
  for (const [chartId, element] of chartElements) {
    const filename = `${chartLabels[chartId] || chartId}_${new Date().toISOString().split('T')[0]}.png`;
    await exportChartAsPNG(element, filename, quality);
    // Small delay between downloads
    await new Promise(r => setTimeout(r, 500));
  }
}
