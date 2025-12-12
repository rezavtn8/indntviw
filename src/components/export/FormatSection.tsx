import React from 'react';
import { ExportSettings } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileImage, FileCode, FileText } from 'lucide-react';

interface FormatSectionProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

const DPI_PRESETS = [
  { value: 72, label: '72 DPI (Screen)' },
  { value: 150, label: '150 DPI (Draft)' },
  { value: 300, label: '300 DPI (Print)' },
  { value: 600, label: '600 DPI (High Quality)' },
];

const SIZE_PRESETS = [
  { value: '800x600', label: 'Small (800×600)', width: 800, height: 600 },
  { value: '1200x900', label: 'Medium (1200×900)', width: 1200, height: 900 },
  { value: '1600x1200', label: 'Large (1600×1200)', width: 1600, height: 1200 },
  { value: '1920x1440', label: 'HD (1920×1440)', width: 1920, height: 1440 },
];

export const FormatSection: React.FC<FormatSectionProps> = ({ settings, onSettingsChange }) => {
  const handleSizePreset = (preset: string) => {
    const size = SIZE_PRESETS.find(s => s.value === preset);
    if (size) {
      onSettingsChange({ ...settings, width: size.width, height: size.height });
    }
  };

  const currentSizePreset = SIZE_PRESETS.find(
    s => s.width === settings.width && s.height === settings.height
  )?.value || 'custom';

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Format</Label>
        <RadioGroup
          value={settings.format}
          onValueChange={(value: ExportSettings['format']) => 
            onSettingsChange({ ...settings, format: value })
          }
          className="grid grid-cols-3 gap-2"
        >
          <div>
            <RadioGroupItem value="png" id="format-png" className="peer sr-only" />
            <Label
              htmlFor="format-png"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileImage className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">PNG</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="svg" id="format-svg" className="peer sr-only" />
            <Label
              htmlFor="format-svg"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileCode className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">SVG</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="pdf" id="format-pdf" className="peer sr-only" />
            <Label
              htmlFor="format-pdf"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">PDF</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Size & DPI in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Size</Label>
          <Select value={currentSizePreset} onValueChange={handleSizePreset}>
            <SelectTrigger className="font-mono h-9">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings.format === 'png' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Resolution</Label>
            <Select
              value={settings.dpi.toString()}
              onValueChange={(value) => onSettingsChange({ ...settings, dpi: parseInt(value) })}
            >
              <SelectTrigger className="font-mono h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DPI_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
