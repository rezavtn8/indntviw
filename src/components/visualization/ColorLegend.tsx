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

// Generate tick values that ALWAYS include the exact min and max of the
// color scale so the legend's range matches the heatmap's range exactly.
const generateNiceTicks = (min: number, max: number, targetCount: number = 5): number[] => {
  if (min === max) return [min];

  const range = max - min;
  const roughStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  // Intermediate nice ticks strictly between min and max
  const intermediates: number[] = [];
  const niceStart = Math.ceil(min / niceStep) * niceStep;
  for (let tick = niceStart; tick < max; tick += niceStep) {
    if (tick > min && tick < max) intermediates.push(tick);
  }

  // Drop intermediates too close to the endpoints (avoid label overlap)
  const minGap = range * 0.08;
  const filtered = intermediates.filter(
    (t) => t - min > minGap && max - t > minGap
  );

  return [min, ...filtered, max];
};

export const ColorLegend: React.FC<ColorLegendProps> = ({
  selectedProperty,
  unit,
  colorScheme,
  minValue,
  maxValue,
}) => {
  // Build gradient top→bottom = max→min. Sample 32 stops for a smooth ramp.
  const gradientStops = Array.from({ length: 32 }, (_, i) => {
    const pos = i / 31; // 0 (top) → 1 (bottom)
    const t = 1 - pos;  // top = max value (t=1), bottom = min value (t=0)
    const { r, g, b } = interpolateColor(t, colorScheme);
    return `rgb(${r}, ${g}, ${b}) ${(pos * 100).toFixed(2)}%`;
  }).join(', ');

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
