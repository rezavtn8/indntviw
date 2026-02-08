import React, { useState } from 'react';
import { Download, Camera, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { IndentationData } from '@/types/indentation';
import { downloadCSV, downloadExcel, captureScreenshot, generatePDFReport } from '@/utils/exportUtils';
import { exportToOriginalTxtFormat } from '@/utils/txtExport';
import { toast } from 'sonner';

interface ExportControlsProps {
  data: IndentationData | null;
  visualizationRef: React.RefObject<HTMLDivElement>;
  selectedProperty: string;
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  data,
  visualizationRef,
  selectedProperty,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportTxt = () => {
    if (!data) return;
    try {
      exportToOriginalTxtFormat(data, `indentation_data_${Date.now()}.txt`);
      toast.success('TXT exported (original format)');
    } catch (error) {
      toast.error('Failed to export TXT');
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    try {
      downloadCSV(data, `indentation_data_${Date.now()}.csv`);
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    try {
      downloadExcel(data, `indentation_data_${Date.now()}.xlsx`);
      toast.success('Excel file exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel file');
    }
  };

  const handleCaptureScreenshot = async () => {
    if (!visualizationRef.current) return;
    setIsExporting(true);
    try {
      await captureScreenshot(visualizationRef.current, `visualization_${Date.now()}.png`);
      toast.success('Screenshot saved');
    } catch (error) {
      toast.error('Failed to capture screenshot');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!data || !visualizationRef.current) return;
    setIsExporting(true);
    try {
      await generatePDFReport(
        data,
        visualizationRef.current,
        selectedProperty,
        `indentation_report_${Date.now()}.pdf`
      );
      toast.success('PDF report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!data || isExporting} className="h-7 gap-1 text-xs px-2">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportTxt} className="gap-2 cursor-pointer">
          <FileType className="w-4 h-4" />
          Save as TXT (Original Format)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCaptureScreenshot} className="gap-2 cursor-pointer">
          <Camera className="w-4 h-4" />
          Save Screenshot
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGeneratePDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Generate PDF Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
