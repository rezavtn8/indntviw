import React from 'react';
import { Slider } from '@/components/ui/slider';
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

export const RangeControls: React.FC<RangeControlsProps> = ({
  dataMin,
  dataMax,
  currentMin,
  currentMax,
  onMinChange,
  onMaxChange,
  onReset,
}) => {
  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(4);
    }
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onMinChange(value);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onMaxChange(value);
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
            type="number"
            value={formatValue(currentMin)}
            onChange={handleMinInputChange}
            className="h-8 font-mono text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground w-10">Max:</span>
          <Input
            type="number"
            value={formatValue(currentMax)}
            onChange={handleMaxInputChange}
            className="h-8 font-mono text-sm"
          />
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground">
        Data range: {formatValue(dataMin)} – {formatValue(dataMax)}
      </div>
    </div>
  );
};
