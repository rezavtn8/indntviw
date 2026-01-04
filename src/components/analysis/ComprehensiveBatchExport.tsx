import React, { useState, useRef, useMemo, useCallback } from 'react';
import { FileSession } from '@/types/fileSession';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileArchive, FileText, Loader2, BarChart3, Layers, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ComprehensiveBatchRenderer, ComprehensiveBatchRendererRef } from './ComprehensiveBatchRenderer';
import { 
  generateBatchPDF, 
  generateBatchZIP, 
  generateStatisticsCSV,
  getPropertyLabel,
  BatchExportOptions
} from '@/utils/batchExportUtils';

interface TreatmentGroup {
  id: string;
  name: string;
  color: string;
  sessionIds: string[];
}

interface ComprehensiveBatchExportProps {
  fileSessions: FileSession[];
  selectedProperty: string;
  propertyNames: string[];
  onPropertyChange: (property: string) => void;
  groups: TreatmentGroup[];
}

export const ComprehensiveBatchExport: React.FC<ComprehensiveBatchExportProps> = ({
  fileSessions,
  selectedProperty,
  propertyNames,
  onPropertyChange,
  groups
}) => {
  const rendererRef = useRef<ComprehensiveBatchRendererRef>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  
  const [options, setOptions] = useState<BatchExportOptions>({
    title: 'Comprehensive Analysis Report',
    author: '',
    property: selectedProperty,
    propertyLabel: getPropertyLabel(selectedProperty),
    format: 'both',
    quality: 'publication',
    includeSections: {
      perSample: true,
      perSampleDistribution: true,
      perSampleZones: true,
      perSampleStats: true,
      crossSample: true,
      crossSamplePlots: true,
      crossSampleTests: true,
      treatmentGroups: groups.length >= 2,
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
    const totalZones = fileSessions.reduce((sum, s) => sum + s.zones.length, 0);
    
    // Smart zones: zones that appear in multiple samples with same name
    const zoneNameCounts = new Map<string, number>();
    for (const session of fileSessions) {
      for (const zone of session.zones) {
        zoneNameCounts.set(zone.name, (zoneNameCounts.get(zone.name) || 0) + 1);
      }
    }
    const smartZoneNames = Array.from(zoneNameCounts.entries()).filter(([, c]) => c >= 2).map(([name]) => name);

    return {
      sampleCount: samplesWithData.length,
      samplesWithZonesCount: samplesWithZones.length,
      totalZones,
      groupCount: groups.length,
      smartZoneNames,
      smartZoneCount: smartZoneNames.length,
      canCrossSample: samplesWithData.length >= 2,
      canTreatmentGroups: groups.length >= 2,
      canSmartZones: smartZoneNames.length >= 1
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

  const getPropertyLabelDisplay = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Settings */}
      <div className="w-80 border-r-2 border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4" />
            Batch Export
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Export all analyses in one package
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Property Selector */}
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Property</Label>
              <Select value={selectedProperty} onValueChange={onPropertyChange}>
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyNames.map(prop => (
                    <SelectItem key={prop} value={prop} className="font-mono text-sm">
                      {getPropertyLabelDisplay(prop)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Report Metadata */}
            <div className="space-y-3">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Report Info</Label>
              <div className="space-y-2">
                <Input
                  value={options.title}
                  onChange={e => setOptions(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Report Title"
                  className="text-sm"
                />
                <Input
                  value={options.author}
                  onChange={e => setOptions(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author (optional)"
                  className="text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Format & Quality */}
            <div className="space-y-3">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Output</Label>
              
              <RadioGroup
                value={options.format}
                onValueChange={v => setOptions(prev => ({ ...prev, format: v as BatchExportOptions['format'] }))}
                className="space-y-1"
              >
                <label className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <span className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> PDF Report
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="zip" id="format-zip" />
                  <span className="text-sm flex items-center gap-2">
                    <FileArchive className="h-4 w-4" /> PNG Archive
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="both" id="format-both" />
                  <span className="text-sm flex items-center gap-2">
                    <Download className="h-4 w-4" /> Both
                  </span>
                </label>
              </RadioGroup>

              <div className="pt-2">
                <Label className="font-mono text-xs text-muted-foreground mb-2 block">Quality</Label>
                <RadioGroup
                  value={options.quality}
                  onValueChange={v => setOptions(prev => ({ ...prev, quality: v as 'screen' | 'print' | 'publication' }))}
                  className="space-y-1"
                >
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="screen" id="quality-screen" />
                    <span className="text-sm">Screen (72 DPI)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="print" id="quality-print" />
                    <span className="text-sm">Print (150 DPI)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="publication" id="quality-publication" />
                    <span className="text-sm font-medium">Publication (300 DPI)</span>
                  </label>
                </RadioGroup>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Export Button */}
        <div className="p-4 border-t border-border space-y-3">
          {isExporting && (
            <div className="space-y-2">
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress.message}</p>
            </div>
          )}
          
          <Button
            onClick={handleExport}
            disabled={isExporting || estimatedCharts === 0}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {estimatedCharts} Charts
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            {options.format === 'both' ? 'PDF + ZIP' : options.format.toUpperCase()} • {options.quality === 'publication' ? '300' : options.quality === 'print' ? '150' : '72'} DPI
          </p>
        </div>
      </div>

      {/* Main Content - Section Selection */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2">Select Sections to Export</h2>
              <p className="text-muted-foreground text-sm">
                All selected analyses will be captured with consistent styling and resolution
              </p>
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
              {/* Section 1: Per-Sample Analysis */}
              <Card className={options.includeSections.perSample ? 'ring-2 ring-primary/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="perSample"
                      checked={options.includeSections.perSample}
                      onCheckedChange={v => updateSection('perSample', !!v)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        1. Per-Sample Analysis
                      </CardTitle>
                      <CardDescription>
                        Individual analysis for each loaded sample ({availability.sampleCount} samples)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {options.includeSections.perSample && (
                  <CardContent className="pt-0 pl-12">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSections.perSampleDistribution}
                          onCheckedChange={v => updateSection('perSampleDistribution', !!v)}
                        />
                        <span className="text-sm">Distribution plots with KDE curves</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSections.perSampleZones}
                          onCheckedChange={v => updateSection('perSampleZones', !!v)}
                          disabled={availability.samplesWithZonesCount === 0}
                        />
                        <span className={`text-sm ${availability.samplesWithZonesCount === 0 ? 'text-muted-foreground' : ''}`}>
                          Zone comparison box plots ({availability.samplesWithZonesCount} samples with zones)
                        </span>
                      </label>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Section 2: Cross-Sample Comparison */}
              <Card className={options.includeSections.crossSample && availability.canCrossSample ? 'ring-2 ring-primary/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="crossSample"
                      checked={options.includeSections.crossSample}
                      onCheckedChange={v => updateSection('crossSample', !!v)}
                      disabled={!availability.canCrossSample}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className={`text-base flex items-center gap-2 ${!availability.canCrossSample ? 'text-muted-foreground' : ''}`}>
                        <Layers className="w-4 h-4" />
                        2. Cross-Sample Comparison
                      </CardTitle>
                      <CardDescription>
                        {availability.canCrossSample 
                          ? `Compare all ${availability.sampleCount} samples side by side`
                          : 'Requires at least 2 samples loaded'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {options.includeSections.crossSample && availability.canCrossSample && (
                  <CardContent className="pt-0 pl-12">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSections.crossSamplePlots}
                          onCheckedChange={v => updateSection('crossSamplePlots', !!v)}
                        />
                        <span className="text-sm">Sample comparison box/violin plots</span>
                      </label>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Section 3: Treatment Groups */}
              <Card className={options.includeSections.treatmentGroups && availability.canTreatmentGroups ? 'ring-2 ring-primary/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="treatmentGroups"
                      checked={options.includeSections.treatmentGroups}
                      onCheckedChange={v => updateSection('treatmentGroups', !!v)}
                      disabled={!availability.canTreatmentGroups}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className={`text-base flex items-center gap-2 ${!availability.canTreatmentGroups ? 'text-muted-foreground' : ''}`}>
                        <Users className="w-4 h-4" />
                        3. Treatment Groups
                      </CardTitle>
                      <CardDescription>
                        {availability.canTreatmentGroups 
                          ? `Compare ${availability.groupCount} defined treatment groups`
                          : availability.groupCount === 0 
                            ? 'No treatment groups defined'
                            : 'Requires at least 2 groups'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Section 4: Smart Zone Analysis */}
              <Card className={options.includeSections.smartZones && availability.canSmartZones ? 'ring-2 ring-primary/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="smartZones"
                      checked={options.includeSections.smartZones}
                      onCheckedChange={v => updateSection('smartZones', !!v)}
                      disabled={!availability.canSmartZones}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <CardTitle className={`text-base flex items-center gap-2 ${!availability.canSmartZones ? 'text-muted-foreground' : ''}`}>
                        <Sparkles className="w-4 h-4" />
                        4. Smart Zone Analysis
                      </CardTitle>
                      <CardDescription>
                        {availability.canSmartZones 
                          ? `${availability.smartZoneCount} zones appear in multiple samples: ${availability.smartZoneNames.slice(0, 3).join(', ')}${availability.smartZoneNames.length > 3 ? '...' : ''}`
                          : 'No matching zone names found across samples'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {options.includeSections.smartZones && availability.canSmartZones && (
                  <CardContent className="pt-0 pl-12">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSections.smartZonesCrossComparison}
                          onCheckedChange={v => updateSection('smartZonesCrossComparison', !!v)}
                        />
                        <span className="text-sm">Cross-zone comparison (all zones aggregated)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={options.includeSections.smartZonesPerZone}
                          onCheckedChange={v => updateSection('smartZonesPerZone', !!v)}
                        />
                        <span className="text-sm">Per-zone across samples ({availability.smartZoneCount} plots)</span>
                      </label>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Export Preview Summary */}
            <Card className="max-w-3xl mx-auto bg-muted/30">
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Export Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Property: {options.propertyLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{estimatedCharts}</p>
                    <p className="text-sm text-muted-foreground">charts to export</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Hidden Renderer */}
      <ComprehensiveBatchRenderer
        ref={rendererRef}
        fileSessions={fileSessions}
        selectedProperty={selectedProperty}
        groups={groups}
        options={options}
      />
    </div>
  );
};
