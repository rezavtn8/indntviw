import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table, FileDown } from 'lucide-react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS, IndentationPoint } from '@/types/indentation';
import { AnalysisReportGenerator } from './AnalysisReportGenerator';

interface AnalysisExportProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  points?: IndentationPoint[];
  propertyNames?: string[];
  showViolin?: boolean;
  showJitter?: boolean;
}

export const AnalysisExport: React.FC<AnalysisExportProps> = ({ 
  data, 
  selectedProperty,
  points = [],
  propertyNames = [],
  showViolin = false,
  showJitter = true,
}) => {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const exportCSV = () => {
    const unit = getPropertyUnit(selectedProperty);
    const headers = ['Zone', 'N', 'Mean', 'SEM', 'SD', '95% CI Lower', '95% CI Upper', 'Median', 'Q1', 'Q3', 'IQR', 'Min', 'Max', 'Range', 'Skewness', 'Kurtosis', 'CV (%)'];
    
    const rows = data.map(d => [
      d.name,
      d.stats.n,
      d.stats.mean.toFixed(6),
      d.stats.sem.toFixed(6),
      d.stats.sd.toFixed(6),
      d.stats.ci95Lower.toFixed(6),
      d.stats.ci95Upper.toFixed(6),
      d.stats.median.toFixed(6),
      d.stats.q1.toFixed(6),
      d.stats.q3.toFixed(6),
      d.stats.iqr.toFixed(6),
      d.stats.min.toFixed(6),
      d.stats.max.toFixed(6),
      d.stats.range.toFixed(6),
      d.stats.skewness.toFixed(6),
      d.stats.kurtosis.toFixed(6),
      d.stats.cv.toFixed(4),
    ]);

    const csv = [
      `# Descriptive Statistics for ${getPropertyLabel(selectedProperty)} (${unit})`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${selectedProperty}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const unit = getPropertyUnit(selectedProperty);
    const label = getPropertyLabel(selectedProperty);

    let md = `# Statistical Analysis Report\n\n`;
    md += `**Property:** ${label}\n`;
    md += `**Unit:** ${unit}\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    md += `## Descriptive Statistics\n\n`;

    md += `| Zone | N | Mean ± SEM | 95% CI | Median | Min | Max |\n`;
    md += `|------|---|------------|--------|--------|-----|-----|\n`;

    data.forEach(d => {
      const s = d.stats;
      md += `| ${d.name} | ${s.n} | ${s.mean.toFixed(2)} ± ${s.sem.toFixed(2)} | [${s.ci95Lower.toFixed(2)}, ${s.ci95Upper.toFixed(2)}] | ${s.median.toFixed(2)} | ${s.min.toFixed(2)} | ${s.max.toFixed(2)} |\n`;
    });

    md += `\n## Summary\n\n`;
    md += `- Total zones analyzed: ${data.length}\n`;
    md += `- Total data points: ${data.reduce((sum, d) => sum + d.stats.n, 0)}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_report_${selectedProperty}_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRawData = () => {
    const unit = getPropertyUnit(selectedProperty);
    
    const headers = data.map(d => d.name);
    const maxLength = Math.max(...data.map(d => d.values.length));
    
    const rows: string[] = [];
    rows.push(headers.join('\t'));
    
    for (let i = 0; i < maxLength; i++) {
      const row = data.map(d => d.values[i]?.toString() ?? '');
      rows.push(row.join('\t'));
    }

    const tsv = [
      `# Raw data for ${getPropertyLabel(selectedProperty)} (${unit})`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      ...rows,
    ].join('\n');

    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raw_data_${selectedProperty}_${new Date().toISOString().split('T')[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="border-2 border-border rounded-lg p-4 space-y-4">
        {/* Primary Action - Full Report */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Generate Full Report
          </h4>
          <p className="text-xs text-muted-foreground font-mono mb-3">
            Create a comprehensive PDF with all charts, statistics, and analysis.
          </p>
          <Button onClick={() => setReportDialogOpen(true)} className="w-full gap-2">
            <FileDown className="w-4 h-4" />
            Open Report Generator
          </Button>
        </div>

        {/* Quick Export Options */}
        <div>
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-3">Quick Export</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Table className="w-4 h-4" />
              Statistics (CSV)
            </Button>
            
            <Button variant="outline" onClick={exportMarkdown} className="gap-2">
              <FileText className="w-4 h-4" />
              Report (Markdown)
            </Button>
            
            <Button variant="outline" onClick={exportRawData} className="gap-2">
              <Download className="w-4 h-4" />
              Raw Data (TSV)
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-mono">
          Export publication-ready statistics and data for further analysis.
        </p>
      </div>

      <AnalysisReportGenerator
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        data={data}
        selectedProperty={selectedProperty}
        points={points}
        propertyNames={propertyNames}
        showViolin={showViolin}
        showJitter={showJitter}
      />
    </>
  );
};
