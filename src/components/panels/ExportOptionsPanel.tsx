import React from 'react';
import { ExportSettings, AxisBounds } from '@/types/zones';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { FormatSection } from '@/components/export/FormatSection';
import { DisplaySection } from '@/components/export/DisplaySection';
import { AdvancedSection } from '@/components/export/AdvancedSection';

interface ExportOptionsPanelProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
  dataBounds?: AxisBounds;
}

export const ExportOptionsPanel: React.FC<ExportOptionsPanelProps> = ({
  settings,
  onSettingsChange,
  onExport,
  isExporting,
  dataBounds,
}) => {
  return (
    <div className="space-y-6">
      {/* Format & Size */}
      <FormatSection settings={settings} onSettingsChange={onSettingsChange} />

      {/* Display Options */}
      <DisplaySection settings={settings} onSettingsChange={onSettingsChange} />

      {/* Advanced Options (collapsed by default) */}
      <AdvancedSection 
        settings={settings} 
        onSettingsChange={onSettingsChange} 
        dataBounds={dataBounds}
      />

      {/* Export Button */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        className="w-full gap-2"
        size="lg"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Exporting...' : `Export ${settings.format.toUpperCase()}`}
      </Button>
    </div>
  );
};
