import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface RangeControlsProps {
  dataMin: number;
  dataMax: number;
  currentMin: number;
  currentMax: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onReset: () => void;
}

const formatDisplay = (value: number): string => {
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
};

export const RangeControls: React.FC<RangeControlsProps> = ({
  dataMin,
  dataMax,
  currentMin,
  currentMax,
  onMinChange,
  onMaxChange,
  onReset,
}) => {
  // Local state so the user can type freely without reformatting
  const [minText, setMinText] = useState(formatDisplay(currentMin));
  const [maxText, setMaxText] = useState(formatDisplay(currentMax));

  // Sync local text when external value changes (e.g. reset, property change)
  useEffect(() => {
    setMinText(formatDisplay(currentMin));
  }, [currentMin]);

  useEffect(() => {
    setMaxText(formatDisplay(currentMax));
  }, [currentMax]);

  const commitMin = () => {
    const value = parseFloat(minText);
    if (!isNaN(value)) {
      onMinChange(value);
    } else {
      setMinText(formatDisplay(currentMin));
    }
  };

  const commitMax = () => {
    const value = parseFloat(maxText);
    if (!isNaN(value)) {
      onMaxChange(value);
    } else {
      setMaxText(formatDisplay(currentMax));
    }
  };

  const handleKeyDown = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
          Value Range
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-6 px-2 font-mono text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground w-10">Min:</span>
          <Input
            type="text"
            inputMode="decimal"
            value={minText}
            onChange={(e) => setMinText(e.target.value)}
            onBlur={commitMin}
            onKeyDown={handleKeyDown(commitMin)}
            className="h-8 font-mono text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground w-10">Max:</span>
          <Input
            type="text"
            inputMode="decimal"
            value={maxText}
            onChange={(e) => setMaxText(e.target.value)}
            onBlur={commitMax}
            onKeyDown={handleKeyDown(commitMax)}
            className="h-8 font-mono text-sm"
          />
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        Data range: {formatDisplay(dataMin)} – {formatDisplay(dataMax)}
      </div>
    </div>
  );
};
