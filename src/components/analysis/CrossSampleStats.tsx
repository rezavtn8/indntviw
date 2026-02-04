import React from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { getSampleColor } from './SampleSelector';
import { StatsTable } from './StatsTable';

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
  const label = getPropertyLabel(selectedProperty);
  const title = `Cross-Sample Statistics: ${label}${unit ? ` (${unit})` : ''}`;

  if (samples.length === 0) {
    return (
      <div className="border border-border rounded-lg p-4">
        <p className="text-muted-foreground font-mono text-[10px] text-center">
          Select samples to view statistics
        </p>
      </div>
    );
  }

  return (
    <StatsTable
      rows={samples.map(sample => ({
        id: sample.id,
        name: sample.name,
        color: getSampleColor(sample.colorIndex),
        stats: sample.stats,
      }))}
      title={title}
      showMinMax={true}
      showIQR={true}
    />
  );
};
