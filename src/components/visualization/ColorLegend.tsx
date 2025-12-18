import React, { useMemo } from 'react';
import { ColorScheme } from '@/types/indentation';
import { interpolateColor } from '@/utils/colorScales';

interface ColorLegendProps {
  selectedProperty: string;
  unit: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
}

// Generate nice round tick values
const generateNiceTicks = (min: number, max: number, targetCount: number = 5): number[] => {
  const range = max - min;
  if (range === 0) return [min];
  
  // Find a nice step size
  const roughStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  
  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  // Generate ticks
  const niceMin = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];
  
  for (let tick = niceMin; tick <= max; tick += niceStep) {
    ticks.push(tick);
  }
  
  // Ensure we have at least min and max represented
  if (ticks.length === 0) {
    return [min, max];
  }
  
  return ticks;
};

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

  const ticks = useMemo(() => generateNiceTicks(minValue, maxValue, 5), [minValue, maxValue]);
  
  const formatValue = (value: number) => {
    // Use integers if all ticks are whole numbers
    const allIntegers = ticks.every(t => Number.isInteger(t));
    if (allIntegers) {
      return value.toFixed(0);
    }
    // Otherwise use minimal decimal places
    if (Math.abs(value) >= 100) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  };

  const barHeight = 120;
  const tickWidth = 6;

  return (
    <div className="flex items-start gap-1">
      {/* Label on top */}
      <div className="flex flex-col items-end">
        <span className="font-mono text-xs font-bold text-foreground mb-1 whitespace-nowrap">
          {selectedProperty}{unit && `(${unit})`}
        </span>
        
        <div className="flex items-stretch">
          {/* Color bar with ticks */}
          <div className="relative" style={{ height: barHeight }}>
            {/* Gradient bar */}
            <div
              className="w-4 h-full border border-foreground/30"
              style={{
                background: `linear-gradient(to bottom, ${gradientStops.reverse().join(', ')})`,
              }}
            />
            
            {/* Tick marks - horizontal lines extending to the right */}
            {ticks.map((tick) => {
              const position = 1 - (tick - minValue) / (maxValue - minValue);
              return (
                <div
                  key={tick}
                  className="absolute bg-foreground"
                  style={{
                    left: '100%',
                    top: `${position * 100}%`,
                    width: tickWidth,
                    height: 1,
                    transform: 'translateY(-0.5px)',
                  }}
                />
              );
            })}
          </div>
          
          {/* Tick labels */}
          <div 
            className="relative ml-1" 
            style={{ height: barHeight, width: 24 }}
          >
            {ticks.map((tick) => {
              const position = 1 - (tick - minValue) / (maxValue - minValue);
              return (
                <span
                  key={tick}
                  className="absolute font-mono text-xs text-foreground whitespace-nowrap"
                  style={{
                    left: tickWidth,
                    top: `${position * 100}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {formatValue(tick)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
