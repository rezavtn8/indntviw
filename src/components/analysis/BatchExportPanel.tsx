import React, { useState, useRef, useMemo, useCallback } from 'react';
import { FileSession } from '@/types/fileSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, FileArchive, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  BatchExportOptions, 
  generateBatchPDF, 
  generateBatchZIP, 
  generateStatisticsCSV,
  getPropertyLabel 
} from '@/utils/batchExportUtils';
import { BatchExportRenderer, BatchExportRendererRef } from './BatchExportRenderer';

interface TreatmentGroup {
  id: string;
  name: string;
  color: string;
  sessionIds: string[];
}

interface BatchExportPanelProps {
  fileSessions: FileSession[];
  selectedProperty: string;
  groups: TreatmentGroup[];
}

export const BatchExportPanel: React.FC<BatchExportPanelProps> = ({
  fileSessions,
  selectedProperty,
  groups
}) => {
  const rendererRef = useRef<BatchExportRendererRef>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  
  const [options, setOptions] = useState<BatchExportOptions>({
    title: 'Batch Analysis Report',
    author: '',
    property: selectedProperty,
    propertyLabel: getPropertyLabel(selectedProperty),
    format: 'both',
    quality: 'print',
    includeSections: {
      perSample: true,
      perSampleDistribution: true,
      perSampleZones: true,
      perSampleStats: true,
      crossSample: true,
      crossSamplePlots: true,
      crossSampleTests: true,
      treatmentGroups: groups.length > 0,
      smartZones: true,
      smartZonesCrossComparison: true,
      smartZonesPerZone: true,
      smartZonesTests: true
    }
  });

  // Update property when it changes
  React.useEffect(() => {
    setOptions(prev => ({
      ...prev,
      property: selectedProperty,
      propertyLabel: getPropertyLabel(selectedProperty)
    }));
  }, [selectedProperty]);

  // Calculate what's available
  const availability = useMemo(() => {
    const samplesWithData = fileSessions.filter(s => s.data);
    const samplesWithZones = fileSessions.filter(s => s.data && s.zones.length > 0);
    
    // Smart zones: zones that appear in multiple samples
    const zoneNameCounts = new Map<string, number>();
    for (const session of fileSessions) {
      for (const zone of session.zones) {
        zoneNameCounts.set(zone.name, (zoneNameCounts.get(zone.name) || 0) + 1);
      }
    }
    const smartZoneCount = Array.from(zoneNameCounts.values()).filter(c => c >= 2).length;

    return {
      sampleCount: samplesWithData.length,
      samplesWithZonesCount: samplesWithZones.length,
      groupCount: groups.length,
      smartZoneCount,
      canCrossSample: samplesWithData.length >= 2,
      canTreatmentGroups: groups.length >= 2,
      canSmartZones: smartZoneCount >= 1
    };
  }, [fileSessions, groups]);

  // Estimate chart count
  const estimatedCharts = useMemo(() => {
    let count = 0;
    const { includeSections } = options;
    
    if (includeSections.perSample) {
      if (includeSections.perSampleDistribution) count += availability.sampleCount;
      if (includeSections.perSampleZones) count += availability.samplesWithZonesCount;
    }
    if (includeSections.crossSample && availability.canCrossSample) {
      if (includeSections.crossSamplePlots) count += 1;
    }
    if (includeSections.treatmentGroups && availability.canTreatmentGroups) {
      count += 1;
    }
    if (includeSections.smartZones && availability.canSmartZones) {
      if (includeSections.smartZonesCrossComparison) count += 1;
      if (includeSections.smartZonesPerZone) count += availability.smartZoneCount;
    }
    
    return count;
  }, [options, availability]);

  const updateSection = useCallback((key: keyof BatchExportOptions['includeSections'], value: boolean) => {
    setOptions(prev => ({
      ...prev,
      includeSections: { ...prev.includeSections, [key]: value }
    }));
  }, []);

  const handleExport = async () => {
    if (!rendererRef.current) return;
    
    setIsExporting(true);
    setProgress({ current: 0, total: estimatedCharts, message: 'Preparing charts...' });

    try {
      // Capture all charts
      const captures = await rendererRef.current.captureAll((current, total, message) => {
        setProgress({ current, total, message });
      });

      if (captures.length === 0) {
        toast.error('No charts to export. Please select at least one section.');
        setIsExporting(false);
        return;
      }

      setProgress({ current: 0, total: 1, message: 'Generating export files...' });

      // Generate statistics CSV
      const statsCSV = generateStatisticsCSV(fileSessions, selectedProperty, groups);

      // Generate exports based on format
      if (options.format === 'zip' || options.format === 'both') {
        await generateBatchZIP(captures, options, statsCSV);
      }

      if (options.format === 'pdf' || options.format === 'both') {
        await generateBatchPDF(captures, options);
      }

      toast.success(`Exported ${captures.length} charts successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Report Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export Settings</CardTitle>
              <CardDescription>Configure your batch export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    value={options.title}
                    onChange={e => setOptions(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Batch Analysis Report"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={options.author}
                    onChange={e => setOptions(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <RadioGroup
                    value={options.format}
                    onValueChange={v => setOptions(prev => ({ ...prev, format: v as BatchExportOptions['format'] }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="format-pdf" />
                      <Label htmlFor="format-pdf" className="font-normal flex items-center gap-2">
                        <FileText className="h-4 w-4" /> PDF Report
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="zip" id="format-zip" />
                      <Label htmlFor="format-zip" className="font-normal flex items-center gap-2">
                        <FileArchive className="h-4 w-4" /> PNG ZIP
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="format-both" />
                      <Label htmlFor="format-both" className="font-normal flex items-center gap-2">
                        <Download className="h-4 w-4" /> Both
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <RadioGroup
                    value={options.quality}
                    onValueChange={v => setOptions(prev => ({ ...prev, quality: v as 'screen' | 'print' }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="screen" id="quality-screen" />
                      <Label htmlFor="quality-screen" className="font-normal">Screen (72 DPI)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="print" id="quality-print" />
                      <Label htmlFor="quality-print" className="font-normal">Print (150 DPI)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Sections to Include</CardTitle>
              <CardDescription>Choose which analyses to export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-Sample */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perSample"
                    checked={options.includeSections.perSample}
                    onCheckedChange={v => updateSection('perSample', !!v)}
                  />
                  <Label htmlFor="perSample" className="font-medium">
                    Per-Sample Analysis
                    <span className="text-muted-foreground font-normal ml-2">
                      ({availability.sampleCount} samples)
                    </span>
                  </Label>
                </div>
                {options.includeSections.perSample && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perSampleDistribution"
                        checked={options.includeSections.perSampleDistribution}
                        onCheckedChange={v => updateSection('perSampleDistribution', !!v)}
                      />
                      <Label htmlFor="perSampleDistribution" className="font-normal">Distribution plots</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perSampleZones"
                        checked={options.includeSections.perSampleZones}
                        onCheckedChange={v => updateSection('perSampleZones', !!v)}
                        disabled={availability.samplesWithZonesCount === 0}
                      />
                      <Label htmlFor="perSampleZones" className="font-normal">
                        Zone comparisons within sample
                        {availability.samplesWithZonesCount === 0 && (
                          <span className="text-muted-foreground ml-2">(no zones defined)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Cross-Sample */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="crossSample"
                    checked={options.includeSections.crossSample}
                    onCheckedChange={v => updateSection('crossSample', !!v)}
                    disabled={!availability.canCrossSample}
                  />
                  <Label htmlFor="crossSample" className="font-medium">
                    Cross-Sample Comparison
                    {!availability.canCrossSample && (
                      <span className="text-muted-foreground font-normal ml-2">(need 2+ samples)</span>
                    )}
                  </Label>
                </div>
                {options.includeSections.crossSample && availability.canCrossSample && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="crossSamplePlots"
                        checked={options.includeSections.crossSamplePlots}
                        onCheckedChange={v => updateSection('crossSamplePlots', !!v)}
                      />
                      <Label htmlFor="crossSamplePlots" className="font-normal">Sample comparison box/violin plots</Label>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Treatment Groups */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="treatmentGroups"
                    checked={options.includeSections.treatmentGroups}
                    onCheckedChange={v => updateSection('treatmentGroups', !!v)}
                    disabled={!availability.canTreatmentGroups}
                  />
                  <Label htmlFor="treatmentGroups" className="font-medium">
                    Treatment Groups
                    {!availability.canTreatmentGroups && (
                      <span className="text-muted-foreground font-normal ml-2">
                        ({availability.groupCount === 0 ? 'no groups defined' : 'need 2+ groups'})
                      </span>
                    )}
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Smart Zones */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smartZones"
                    checked={options.includeSections.smartZones}
                    onCheckedChange={v => updateSection('smartZones', !!v)}
                    disabled={!availability.canSmartZones}
                  />
                  <Label htmlFor="smartZones" className="font-medium">
                    Smart Zone Analysis
                    <span className="text-muted-foreground font-normal ml-2">
                      ({availability.smartZoneCount} matching zones across samples)
                    </span>
                  </Label>
                </div>
                {options.includeSections.smartZones && availability.canSmartZones && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smartZonesCrossComparison"
                        checked={options.includeSections.smartZonesCrossComparison}
                        onCheckedChange={v => updateSection('smartZonesCrossComparison', !!v)}
                      />
                      <Label htmlFor="smartZonesCrossComparison" className="font-normal">
                        Cross-zone comparison (aggregated)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smartZonesPerZone"
                        checked={options.includeSections.smartZonesPerZone}
                        onCheckedChange={v => updateSection('smartZonesPerZone', !!v)}
                      />
                      <Label htmlFor="smartZonesPerZone" className="font-normal">
                        Per-zone across samples
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium">{options.propertyLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Estimated charts:</span>
                <span className="font-medium">{estimatedCharts}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Output format:</span>
                <span className="font-medium">
                  {options.format === 'both' ? 'PDF + ZIP' : options.format.toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Export Button & Progress */}
      <div className="border-t p-4 space-y-3">
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.message}</span>
              <span className="text-muted-foreground">
                {progress.current}/{progress.total}
              </span>
            </div>
            <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} />
          </div>
        )}
        
        <Button
          className="w-full"
          size="lg"
          onClick={handleExport}
          disabled={isExporting || estimatedCharts === 0}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download All ({estimatedCharts} charts)
            </>
          )}
        </Button>
      </div>

      {/* Hidden renderer for chart capture */}
      <BatchExportRenderer
        ref={rendererRef}
        fileSessions={fileSessions}
        selectedProperty={selectedProperty}
        groups={groups}
        options={options}
      />
    </div>
  );
};
