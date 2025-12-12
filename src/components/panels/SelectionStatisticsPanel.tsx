import React, { useMemo, useState } from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { calculateExtendedStatistics, calculateCoordinateRanges } from '@/utils/statisticsUtils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionStatisticsPanelProps {
  allPoints: IndentationPoint[];
  selectedPoints: IndentationPoint[];
  selectedProperty: string;
  onExportSelected?: () => void;
  defaultOpen?: boolean;
}

export const SelectionStatisticsPanel: React.FC<SelectionStatisticsPanelProps> = ({
  allPoints,
  selectedPoints,
  selectedProperty,
  onExportSelected,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-2 border-border bg-card shadow-sm">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
            Statistics
          </h3>
          <div className="flex items-center gap-2">
            {hasSelection && onExportSelected && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onExportSelected();
                }} 
                className="h-6 px-2 gap-1"
              >
                <Download className="w-3 h-3" />
                <span className="font-mono text-xs">Export</span>
              </Button>
            )}
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4">

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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
