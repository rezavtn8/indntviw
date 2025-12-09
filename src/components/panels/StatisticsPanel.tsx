import React from 'react';
import { IndentationData, PROPERTY_CONFIGS } from '@/types/indentation';

interface StatisticsPanelProps {
  data: IndentationData | null;
  selectedProperty: string;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  data,
  selectedProperty,
}) => {
  if (!data) return null;

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(2);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(4);
    } else {
      return value.toExponential(3);
    }
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const stats = [
    { label: 'Count', value: data.points.length.toString(), unit: 'points' },
    { label: 'Min', value: formatValue(data.statistics.min[selectedProperty] ?? 0), unit: getPropertyUnit(selectedProperty) },
    { label: 'Max', value: formatValue(data.statistics.max[selectedProperty] ?? 0), unit: getPropertyUnit(selectedProperty) },
    { label: 'Mean', value: formatValue(data.statistics.mean[selectedProperty] ?? 0), unit: getPropertyUnit(selectedProperty) },
    { label: 'Std Dev', value: formatValue(data.statistics.stdDev[selectedProperty] ?? 0), unit: getPropertyUnit(selectedProperty) },
  ];

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm">
      <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground mb-3">
        Statistics
      </h3>
      
      <div className="space-y-2">
        {stats.map(({ label, value, unit }) => (
          <div
            key={label}
            className="flex items-center justify-between font-mono text-xs"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold">
              {value}
              {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
