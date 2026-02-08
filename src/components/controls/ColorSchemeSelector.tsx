import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorScheme } from '@/types/indentation';
import { interpolateColor } from '@/utils/colorScales';

interface ColorSchemeSelectorProps {
  colorScheme: ColorScheme;
  onColorSchemeChange: (scheme: ColorScheme) => void;
}

const colorSchemes: { value: ColorScheme; label: string }[] = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'magma', label: 'Magma' },
  { value: 'turbo', label: 'Turbo' },
  { value: 'jet', label: 'Jet' },
  { value: 'coolwarm', label: 'Cool–Warm' },
  { value: 'cividis', label: 'Cividis' },
];

const ColorPreview: React.FC<{ scheme: ColorScheme }> = ({ scheme }) => {
  const gradientStops = Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    const { r, g, b } = interpolateColor(t, scheme);
    return `rgb(${r}, ${g}, ${b})`;
  });

  return (
    <div
      className="w-16 h-4 border border-border"
      style={{
        background: `linear-gradient(to right, ${gradientStops.join(', ')})`,
      }}
    />
  );
};

export const ColorSchemeSelector: React.FC<ColorSchemeSelectorProps> = ({
  colorScheme,
  onColorSchemeChange,
}) => {
  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        Color Scheme
      </label>
      <Select value={colorScheme} onValueChange={onColorSchemeChange}>
        <SelectTrigger className="w-full font-mono text-sm">
          <SelectValue placeholder="Select scheme" />
        </SelectTrigger>
        <SelectContent>
          {colorSchemes.map(({ value, label }) => (
            <SelectItem key={value} value={value} className="font-mono text-sm">
              <div className="flex items-center gap-3">
                <ColorPreview scheme={value} />
                <span>{label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
