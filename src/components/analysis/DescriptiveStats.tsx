import React from 'react';
import { DescriptiveStats as DescriptiveStatsType } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DescriptiveStatsProps {
  stats: { name: string; color: string; stats: DescriptiveStatsType }[];
  selectedProperty: string;
}

export const DescriptiveStats: React.FC<DescriptiveStatsProps> = ({ stats, selectedProperty }) => {
  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const formatValue = (val: number, decimals = 4): string => {
    if (val === 0) return '0';
    if (Math.abs(val) >= 10000) return val.toExponential(2);
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) >= 1) return val.toFixed(decimals);
    return val.toFixed(decimals);
  };

  const unit = getPropertyUnit(selectedProperty);

  const rows = [
    { label: 'N', key: 'n', format: (v: number) => v.toString() },
    { label: 'Mean', key: 'mean', format: formatValue },
    { label: 'SEM', key: 'sem', format: formatValue },
    { label: 'SD', key: 'sd', format: formatValue },
    { label: '95% CI Lower', key: 'ci95Lower', format: formatValue },
    { label: '95% CI Upper', key: 'ci95Upper', format: formatValue },
    { label: 'Median', key: 'median', format: formatValue },
    { label: 'Q1 (25%)', key: 'q1', format: formatValue },
    { label: 'Q3 (75%)', key: 'q3', format: formatValue },
    { label: 'IQR', key: 'iqr', format: formatValue },
    { label: 'Min', key: 'min', format: formatValue },
    { label: 'Max', key: 'max', format: formatValue },
    { label: 'Range', key: 'range', format: formatValue },
    { label: 'Skewness', key: 'skewness', format: (v: number) => formatValue(v, 3) },
    { label: 'Kurtosis', key: 'kurtosis', format: (v: number) => formatValue(v, 3) },
    { label: 'CV (%)', key: 'cv', format: (v: number) => formatValue(v, 2) },
  ];

  return (
    <div className="border-2 border-border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-2 border-b border-border">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
          Descriptive Statistics
          {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
        </h4>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs uppercase w-32">Statistic</TableHead>
              {stats.map(s => (
                <TableHead key={s.name} className="font-mono text-xs text-center min-w-24">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.key}>
                <TableCell className="font-mono text-xs font-medium">{row.label}</TableCell>
                {stats.map(s => (
                  <TableCell key={s.name} className="font-mono text-xs text-center">
                    {row.format((s.stats as any)[row.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
