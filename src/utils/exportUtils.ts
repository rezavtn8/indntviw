import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { IndentationData, IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';

// Export to CSV
export function exportToCSV(data: IndentationData): string {
  const headers = ['ID', 'X (mm)', 'Y (mm)', 'Z (mm)', ...data.propertyNames];
  const rows = data.points.map(point => [
    point.id + 1,
    point.x,
    point.y,
    point.z,
    ...data.propertyNames.map(prop => point.properties[prop] ?? '')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

// Download CSV file
export function downloadCSV(data: IndentationData, filename: string = 'indentation_data.csv') {
  const csv = exportToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export to Excel
export function downloadExcel(data: IndentationData, filename: string = 'indentation_data.xlsx') {
  const headers = ['ID', 'X (mm)', 'Y (mm)', 'Z (mm)', ...data.propertyNames];
  const rows = data.points.map(point => [
    point.id + 1,
    point.x,
    point.y,
    point.z,
    ...data.propertyNames.map(prop => point.properties[prop] ?? '')
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Auto-size columns
  const colWidths = headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map(row => String(row[i]).length)
    );
    return { wch: Math.min(maxLength + 2, 20) };
  });
  worksheet['!cols'] = colWidths;

  // Add statistics sheet
  const statsData = [
    ['Statistic', ...data.propertyNames],
    ['Min', ...data.propertyNames.map(p => data.statistics.min[p] ?? '')],
    ['Max', ...data.propertyNames.map(p => data.statistics.max[p] ?? '')],
    ['Mean', ...data.propertyNames.map(p => data.statistics.mean[p] ?? '')],
    ['Std Dev', ...data.propertyNames.map(p => data.statistics.stdDev[p] ?? '')]
  ];
  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');

  XLSX.writeFile(workbook, filename);
}

// Capture screenshot of an element
export async function captureScreenshot(
  element: HTMLElement,
  filename: string = 'visualization.png'
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    useCORS: true
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate PDF report
export async function generatePDFReport(
  data: IndentationData,
  visualizationElement: HTMLElement,
  selectedProperty: string,
  filename: string = 'indentation_report.pdf'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Nanoindentation Analysis Report', margin, yPos);
  yPos += 12;

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
  yPos += 10;

  // Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, yPos);
  yPos += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Points: ${data.points.length}`, margin, yPos);
  yPos += 5;
  pdf.text(`Properties: ${data.propertyNames.join(', ')}`, margin, yPos);
  yPos += 10;

  // Visualization screenshot
  try {
    const canvas = await html2canvas(visualizationElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (yPos + imgHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
    
    pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 100));
    yPos += Math.min(imgHeight, 100) + 10;
  } catch (error) {
    console.error('Failed to capture visualization:', error);
  }

  // Statistics table
  if (yPos + 60 > pageHeight - margin) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Statistics', margin, yPos);
  yPos += 7;

  // Selected property stats
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const statsToShow = [selectedProperty, ...data.propertyNames.filter(p => p !== selectedProperty).slice(0, 5)];
  
  for (const prop of statsToShow) {
    const label = getPropertyLabel(prop);
    const unit = getPropertyUnit(prop);
    const stats = data.statistics;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}${unit ? ` (${unit})` : ''}:`, margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`  Min: ${stats.min[prop]?.toFixed(4) ?? 'N/A'}`, margin, yPos);
    pdf.text(`  Max: ${stats.max[prop]?.toFixed(4) ?? 'N/A'}`, margin + 50, yPos);
    yPos += 5;
    pdf.text(`  Mean: ${stats.mean[prop]?.toFixed(4) ?? 'N/A'}`, margin, yPos);
    pdf.text(`  Std Dev: ${stats.stdDev[prop]?.toFixed(4) ?? 'N/A'}`, margin + 50, yPos);
    yPos += 8;

    if (yPos > pageHeight - margin - 20) {
      pdf.addPage();
      yPos = margin;
    }
  }

  // Data table (first 20 points as sample)
  pdf.addPage();
  yPos = margin;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Sample Data (First 20 Points)', margin, yPos);
  yPos += 10;

  pdf.setFontSize(8);
  const tableHeaders = ['ID', 'X', 'Y', selectedProperty];
  const colWidth = (pageWidth - margin * 2) / tableHeaders.length;

  // Table header
  pdf.setFont('helvetica', 'bold');
  tableHeaders.forEach((header, i) => {
    pdf.text(header, margin + i * colWidth, yPos);
  });
  yPos += 5;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  const samplePoints = data.points.slice(0, 20);
  samplePoints.forEach(point => {
    const row = [
      String(point.id + 1),
      point.x.toFixed(4),
      point.y.toFixed(4),
      (point.properties[selectedProperty]?.toFixed(4) ?? 'N/A')
    ];
    row.forEach((cell, i) => {
      pdf.text(cell, margin + i * colWidth, yPos);
    });
    yPos += 4;
  });

  pdf.save(filename);
}
