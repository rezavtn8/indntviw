import React from 'react';
import { ColorScheme } from '@/types/indentation';
import { interpolateColor } from '@/utils/colorScales';

interface ColorLegendProps {
  selectedProperty: string;
  unit: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  selectedProperty,
  unit,
  colorScheme,
  minValue,
  maxValue,
}) => {
  const gradientStops = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    const { r, g, b } = interpolateColor(t, colorScheme);
    return `rgb(${r}, ${g}, ${b}) ${t * 100}%`;
  });

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(4);
    }
  };

  return (
    <div className="border-2 border-border bg-card p-4 shadow-sm">
      <h3 className="font-mono text-sm font-bold mb-3 text-foreground uppercase tracking-wide">
        {selectedProperty}
        {unit && <span className="text-muted-foreground ml-1">({unit})</span>}
      </h3>
      
      <div className="flex items-stretch gap-3">
        <div
          className="w-6 h-40 border-2 border-border"
          style={{
            background: `linear-gradient(to bottom, ${gradientStops.reverse().join(', ')})`,
          }}
        />
        
        <div className="flex flex-col justify-between font-mono text-xs text-foreground">
          <span className="font-bold">{formatValue(maxValue)}</span>
          <span className="text-muted-foreground">{formatValue((maxValue + minValue) / 2)}</span>
          <span className="font-bold">{formatValue(minValue)}</span>
        </div>
      </div>
    </div>
  );
};
