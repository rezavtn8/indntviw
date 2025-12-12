import React from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { getSampleColor } from './SampleSelector';

interface SampleData {
  id: string;
  name: string;
  colorIndex: number;
  values: number[];
  stats: DescriptiveStats;
}

interface CrossSampleStatsProps {
  samples: SampleData[];
  selectedProperty: string;
}

export const CrossSampleStats: React.FC<CrossSampleStatsProps> = ({
  samples,
  selectedProperty,
}) => {
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    if (Math.abs(val) >= 1) return val.toFixed(2);
    return val.toFixed(4);
  };

  if (samples.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <p className="text-muted-foreground font-mono text-sm text-center">
          Select samples to view statistics
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 border-b border-border">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
          Cross-Sample Statistics: {getPropertyLabel(selectedProperty)}
          {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
        </h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-2 font-bold">Sample</th>
              <th className="text-right px-4 py-2 font-bold">N</th>
              <th className="text-right px-4 py-2 font-bold">Mean</th>
              <th className="text-right px-4 py-2 font-bold">SD</th>
              <th className="text-right px-4 py-2 font-bold">Median</th>
              <th className="text-right px-4 py-2 font-bold">Min</th>
              <th className="text-right px-4 py-2 font-bold">Max</th>
              <th className="text-right px-4 py-2 font-bold">IQR</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getSampleColor(sample.colorIndex) }}
                    />
                    <span className="truncate max-w-[150px]">{sample.name}</span>
                  </div>
                </td>
                <td className="text-right px-4 py-2">{sample.stats.n}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.mean)}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.sd)}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.median)}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.min)}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.max)}</td>
                <td className="text-right px-4 py-2">{formatValue(sample.stats.iqr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
