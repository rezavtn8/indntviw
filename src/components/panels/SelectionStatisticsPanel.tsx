import React, { useMemo } from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { calculateExtendedStatistics, calculateCoordinateRanges } from '@/utils/statisticsUtils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface SelectionStatisticsPanelProps {
  allPoints: IndentationPoint[];
  selectedPoints: IndentationPoint[];
  selectedProperty: string;
  onExportSelected?: () => void;
}

export const SelectionStatisticsPanel: React.FC<SelectionStatisticsPanelProps> = ({
  allPoints,
  selectedPoints,
  selectedProperty,
  onExportSelected,
}) => {
  const allStats = useMemo(
    () => calculateExtendedStatistics(allPoints, selectedProperty),
    [allPoints, selectedProperty]
  );

  const selectedStats = useMemo(
    () => calculateExtendedStatistics(selectedPoints, selectedProperty),
    [selectedPoints, selectedProperty]
  );

  const coordRanges = useMemo(
    () => calculateCoordinateRanges(selectedPoints),
    [selectedPoints]
  );

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) return value.toFixed(2);
    if (Math.abs(value) >= 1) return value.toFixed(4);
    return value.toExponential(3);
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  const unit = getPropertyUnit(selectedProperty);

  const stats = [
    { label: 'Count', all: allStats.count.toString(), selected: selectedStats.count.toString(), unit: 'pts' },
    { label: 'Min', all: formatValue(allStats.min), selected: formatValue(selectedStats.min), unit },
    { label: 'Max', all: formatValue(allStats.max), selected: formatValue(selectedStats.max), unit },
    { label: 'Mean', all: formatValue(allStats.mean), selected: formatValue(selectedStats.mean), unit },
    { label: 'Median', all: formatValue(allStats.median), selected: formatValue(selectedStats.median), unit },
    { label: 'Std Dev', all: formatValue(allStats.stdDev), selected: formatValue(selectedStats.stdDev), unit },
    { label: '25th %', all: formatValue(allStats.percentile25), selected: formatValue(selectedStats.percentile25), unit },
    { label: '75th %', all: formatValue(allStats.percentile75), selected: formatValue(selectedStats.percentile75), unit },
  ];

  const hasSelection = selectedPoints.length > 0;

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
          Statistics
        </h3>
        {hasSelection && onExportSelected && (
          <Button variant="ghost" size="sm" onClick={onExportSelected} className="h-6 px-2 gap-1">
            <Download className="w-3 h-3" />
            <span className="font-mono text-xs">Export</span>
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs mb-2 pb-2 border-b border-border">
        <span className="text-muted-foreground">Stat</span>
        <span className="text-muted-foreground text-right">All</span>
        <span className={`text-right ${hasSelection ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          {hasSelection ? 'Selected' : '—'}
        </span>
      </div>

      {/* Stats rows */}
      <div className="space-y-1.5">
        {stats.map(({ label, all, selected, unit: u }) => (
          <div key={label} className="grid grid-cols-3 gap-2 font-mono text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{all}</span>
            <span className={`text-right ${hasSelection ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {hasSelection ? selected : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Coordinate ranges for selection */}
      {hasSelection && (
        <div className="mt-4 pt-3 border-t border-border">
          <h4 className="font-mono text-xs font-bold text-muted-foreground mb-2">
            Selected Region
          </h4>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">X Range</span>
              <span>{coordRanges.xRange[0].toFixed(3)} – {coordRanges.xRange[1].toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Y Range</span>
              <span>{coordRanges.yRange[0].toFixed(3)} – {coordRanges.yRange[1].toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Z Range</span>
              <span>{coordRanges.zRange[0].toFixed(3)} – {coordRanges.zRange[1].toFixed(3)} mm</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
