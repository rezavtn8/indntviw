/**
 * Compact Statistics Table Component
 * 
 * Shared component for rendering statistics in a professional, compact table format.
 */

import React from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';

export interface StatsTableRow {
  id: string;
  name: string;
  color?: string;
  stats: DescriptiveStats;
  sampleCount?: number; // For group stats showing # of samples
}

interface StatsTableProps {
  rows: StatsTableRow[];
  title: string;
  /** Show min/max columns */
  showMinMax?: boolean;
  /** Show IQR column */
  showIQR?: boolean;
  /** Show sample count badge after name */
  showSampleCount?: boolean;
}

/** Format values compactly: 2-3 decimals, scientific only when tiny */
const formatValue = (val: number): string => {
  if (val === 0) return '0';
  if (Math.abs(val) >= 1000) return val.toFixed(1);
  if (Math.abs(val) >= 100) return val.toFixed(1);
  if (Math.abs(val) >= 1) return val.toFixed(2);
  if (Math.abs(val) >= 0.01) return val.toFixed(3);
  return val.toExponential(1);
};

export const StatsTable: React.FC<StatsTableProps> = ({
  rows,
  title,
  showMinMax = false,
  showIQR = true,
  showSampleCount = false,
}) => {
  if (rows.length === 0) {
    return (
      <div className="border border-border rounded-lg p-3 text-center">
        <p className="text-muted-foreground font-mono text-[10px]">No data available</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted/40 px-2 py-1.5 border-b border-border">
        <h5 className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </h5>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="bg-muted/20 border-b border-border text-muted-foreground">
              <th className="text-left px-2 py-1 font-semibold min-w-[80px]">Name</th>
              <th className="text-right px-1.5 py-1 font-semibold w-10">N</th>
              <th className="text-right px-1.5 py-1 font-semibold w-14">Mean</th>
              <th className="text-right px-1.5 py-1 font-semibold w-12">SD</th>
              <th className="text-right px-1.5 py-1 font-semibold w-14">Med</th>
              {showMinMax && (
                <>
                  <th className="text-right px-1.5 py-1 font-semibold w-12">Min</th>
                  <th className="text-right px-1.5 py-1 font-semibold w-12">Max</th>
                </>
              )}
              {showIQR && (
                <th className="text-right px-1.5 py-1 font-semibold w-12">IQR</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {row.color && (
                      <div 
                        className="w-2 h-2 rounded-sm flex-shrink-0" 
                        style={{ backgroundColor: row.color }} 
                      />
                    )}
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                    {showSampleCount && row.sampleCount !== undefined && (
                      <span className="text-muted-foreground flex-shrink-0">
                        ({row.sampleCount})
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right px-1.5 py-1 text-muted-foreground tabular-nums">
                  {row.stats.n}
                </td>
                <td className="text-right px-1.5 py-1 tabular-nums font-medium">
                  {formatValue(row.stats.mean)}
                </td>
                <td className="text-right px-1.5 py-1 tabular-nums text-muted-foreground">
                  {formatValue(row.stats.sd)}
                </td>
                <td className="text-right px-1.5 py-1 tabular-nums">
                  {formatValue(row.stats.median)}
                </td>
                {showMinMax && (
                  <>
                    <td className="text-right px-1.5 py-1 tabular-nums text-muted-foreground">
                      {formatValue(row.stats.min)}
                    </td>
                    <td className="text-right px-1.5 py-1 tabular-nums text-muted-foreground">
                      {formatValue(row.stats.max)}
                    </td>
                  </>
                )}
                {showIQR && (
                  <td className="text-right px-1.5 py-1 tabular-nums text-muted-foreground">
                    {formatValue(row.stats.iqr)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
