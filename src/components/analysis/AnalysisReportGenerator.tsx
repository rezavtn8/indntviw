import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileDown, 
  FileText, 
  Image as ImageIcon, 
  Settings2, 
  BarChart3, 
  Loader2,
  CheckCircle,
  Download
} from 'lucide-react';
import { DescriptiveStats as DescriptiveStatsType } from '@/utils/advancedStatistics';
import { BoxViolinPlots } from './BoxViolinPlots';
import { DescriptiveStats } from './DescriptiveStats';
import { DistributionPlots } from './DistributionPlots';
import { StatisticalTests } from './StatisticalTests';
import { CorrelationAnalysis } from './CorrelationAnalysis';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { 
  generateAnalysisPDF, 
  exportChartAsPNG, 
  exportChartsAsZIP,
  AnalysisData,
  ReportOptions
} from '@/utils/analysisExportUtils';

interface AnalysisReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: { name: string; color: string; values: number[]; stats: DescriptiveStatsType }[];
  selectedProperty: string;
  points: IndentationPoint[];
  propertyNames: string[];
  showViolin?: boolean;
  showJitter?: boolean;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  ref: React.RefObject<HTMLDivElement>;
}

export const AnalysisReportGenerator: React.FC<AnalysisReportGeneratorProps> = ({
  open,
  onOpenChange,
  data,
  selectedProperty,
  points,
  propertyNames,
  showViolin = false,
  showJitter = true,
}) => {
  const [reportTitle, setReportTitle] = useState('Nanoindentation Analysis Report');
  const [quality, setQuality] = useState<'screen' | 'print'>('print');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeRawData, setIncludeRawData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  
  // Section toggles
  const [enabledSections, setEnabledSections] = useState({
    stats: true,
    boxplot: true,
    distribution: true,
    tests: true,
    correlation: true,
  });
  
  // Refs for chart elements (for capture)
  const boxplotRef = useRef<HTMLDivElement>(null);
  const distributionRef = useRef<HTMLDivElement>(null);
  const testsRef = useRef<HTMLDivElement>(null);
  const correlationRef = useRef<HTMLDivElement>(null);
  
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };
  
  const sections: SectionConfig[] = [
    { id: 'stats', label: 'Descriptive Statistics', icon: <BarChart3 className="w-4 h-4" />, ref: boxplotRef },
    { id: 'boxplot', label: 'Box/Violin Plots', icon: <BarChart3 className="w-4 h-4" />, ref: boxplotRef },
    { id: 'distribution', label: 'Distribution Analysis', icon: <BarChart3 className="w-4 h-4" />, ref: distributionRef },
    { id: 'tests', label: 'Statistical Tests', icon: <BarChart3 className="w-4 h-4" />, ref: testsRef },
    { id: 'correlation', label: 'Correlation Matrix', icon: <BarChart3 className="w-4 h-4" />, ref: correlationRef },
  ];
  
  const toggleSection = (sectionId: string) => {
    setEnabledSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId as keyof typeof prev],
    }));
  };
  
  const selectAllSections = () => {
    setEnabledSections({
      stats: true,
      boxplot: true,
      distribution: true,
      tests: true,
      correlation: true,
    });
  };
  
  const clearAllSections = () => {
    setEnabledSections({
      stats: false,
      boxplot: false,
      distribution: false,
      tests: false,
      correlation: false,
    });
  };
  
  const enabledCount = Object.values(enabledSections).filter(Boolean).length;
  
  // Generate PDF report
  const handleGeneratePDF = useCallback(async () => {
    setIsGenerating(true);
    setGenerationStatus('Preparing charts...');
    
    try {
      // Wait for charts to render
      await new Promise(r => setTimeout(r, 500));
      
      // Collect chart elements
      const chartElements = new Map<string, HTMLElement>();
      
      if (enabledSections.boxplot && boxplotRef.current) {
        chartElements.set('boxplot', boxplotRef.current);
      }
      if (enabledSections.distribution && distributionRef.current) {
        chartElements.set('distribution', distributionRef.current);
      }
      if (enabledSections.tests && testsRef.current) {
        chartElements.set('tests', testsRef.current);
      }
      if (enabledSections.correlation && correlationRef.current) {
        chartElements.set('correlation', correlationRef.current);
      }
      
      setGenerationStatus('Generating PDF...');
      
      const options: ReportOptions = {
        title: reportTitle,
        selectedProperty,
        quality,
        pageSize,
        orientation,
        includeRawData,
      };
      
      await generateAnalysisPDF(data as AnalysisData[], chartElements, options);
      
      setGenerationStatus('Complete!');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStatus('');
      }, 1500);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setGenerationStatus('Failed - please try again');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStatus('');
      }, 2000);
    }
  }, [data, selectedProperty, reportTitle, quality, pageSize, orientation, includeRawData, enabledSections]);
  
  // Export individual chart
  const handleExportChart = useCallback(async (chartId: string, ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const filename = `${chartId}_${selectedProperty}_${new Date().toISOString().split('T')[0]}.png`;
    await exportChartAsPNG(ref.current, filename, quality);
  }, [selectedProperty, quality]);
  
  // Export all charts as separate files
  const handleExportAllCharts = useCallback(async () => {
    setIsGenerating(true);
    setGenerationStatus('Exporting charts...');
    
    const chartElements = new Map<string, HTMLElement>();
    if (enabledSections.boxplot && boxplotRef.current) {
      chartElements.set('boxplot', boxplotRef.current);
    }
    if (enabledSections.distribution && distributionRef.current) {
      chartElements.set('distribution', distributionRef.current);
    }
    if (enabledSections.tests && testsRef.current) {
      chartElements.set('tests', testsRef.current);
    }
    if (enabledSections.correlation && correlationRef.current) {
      chartElements.set('correlation', correlationRef.current);
    }
    
    await exportChartsAsZIP(chartElements, quality);
    
    setGenerationStatus('Done!');
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationStatus('');
    }, 1000);
  }, [enabledSections, quality]);
  
  if (data.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Generate Analysis Report</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-mono text-sm">
              No data selected for analysis. Enable "All Data" or select zones first.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Settings */}
          <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
            <div className="p-4 border-b border-border">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Report Generator
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Configure and export your analysis report
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Report Title */}
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Report Title
                  </Label>
                  <Input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Enter report title..."
                    className="font-mono text-sm"
                  />
                </div>
                
                {/* Property Info */}
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="font-mono text-xs text-muted-foreground">Analyzing</p>
                  <p className="font-mono text-sm font-bold">{getPropertyLabel(selectedProperty)}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {data.length} zone{data.length !== 1 ? 's' : ''} • {data.reduce((sum, d) => sum + d.stats.n, 0).toLocaleString()} points
                  </p>
                </div>
                
                <Separator />
                
                {/* Sections to Include */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">
                      Include Sections
                    </Label>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllSections}
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        All
                      </button>
                      <button
                        onClick={clearAllSections}
                        className="text-xs text-muted-foreground hover:underline font-mono"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          enabledSections[section.id as keyof typeof enabledSections]
                            ? 'bg-primary/10'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={enabledSections[section.id as keyof typeof enabledSections]}
                          onCheckedChange={() => toggleSection(section.id)}
                        />
                        <span className="font-mono text-sm">{section.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Export Settings */}
                <div className="space-y-4">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Export Settings
                  </Label>
                  
                  {/* Quality */}
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Quality</Label>
                    <RadioGroup value={quality} onValueChange={(v) => setQuality(v as 'screen' | 'print')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="screen" id="screen" />
                        <Label htmlFor="screen" className="font-mono text-sm cursor-pointer">
                          Screen (150 DPI)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="print" id="print" />
                        <Label htmlFor="print" className="font-mono text-sm cursor-pointer">
                          Print (300 DPI)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Page Size */}
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Page Size</Label>
                    <Select value={pageSize} onValueChange={(v) => setPageSize(v as 'a4' | 'letter')}>
                      <SelectTrigger className="font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Orientation */}
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Orientation</Label>
                    <Select value={orientation} onValueChange={(v) => setOrientation(v as 'portrait' | 'landscape')}>
                      <SelectTrigger className="font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Include Raw Data */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={includeRawData}
                      onCheckedChange={(checked) => setIncludeRawData(checked as boolean)}
                    />
                    <span className="font-mono text-sm">Include raw data sample</span>
                  </label>
                </div>
              </div>
            </ScrollArea>
            
            {/* Export Buttons */}
            <div className="p-4 border-t border-border bg-background space-y-2">
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-2">
                  {generationStatus === 'Complete!' || generationStatus === 'Done!' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {generationStatus}
                </div>
              )}
              
              <Button
                onClick={handleGeneratePDF}
                disabled={isGenerating || enabledCount === 0}
                className="w-full gap-2 font-mono"
              >
                <FileDown className="w-4 h-4" />
                Generate PDF Report
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportAllCharts}
                disabled={isGenerating || enabledCount === 0}
                className="w-full gap-2 font-mono"
              >
                <ImageIcon className="w-4 h-4" />
                Export Charts as PNG
              </Button>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="flex-1 bg-background overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold">Live Preview</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Charts will be captured at selected quality
                </p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {enabledCount} section{enabledCount !== 1 ? 's' : ''} enabled
              </Badge>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Box Plots */}
                {enabledSections.boxplot && (
                  <div ref={boxplotRef} className="relative group">
                    <BoxViolinPlots
                      data={data}
                      selectedProperty={selectedProperty}
                      showViolin={showViolin}
                      showJitter={showJitter}
                    />
                    <button
                      onClick={() => handleExportChart('boxplot', boxplotRef)}
                      className="absolute top-2 right-2 p-2 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Distribution Plots */}
                {enabledSections.distribution && (
                  <div ref={distributionRef} className="relative group">
                    <DistributionPlots
                      data={data}
                      selectedProperty={selectedProperty}
                    />
                    <button
                      onClick={() => handleExportChart('distribution', distributionRef)}
                      className="absolute top-2 right-2 p-2 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Statistical Tests */}
                {enabledSections.tests && data.length >= 2 && (
                  <div ref={testsRef} className="relative group">
                    <StatisticalTests
                      data={data}
                      selectedProperty={selectedProperty}
                    />
                    <button
                      onClick={() => handleExportChart('tests', testsRef)}
                      className="absolute top-2 right-2 p-2 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Correlation Analysis */}
                {enabledSections.correlation && propertyNames.length >= 2 && (
                  <div ref={correlationRef} className="relative group">
                    <CorrelationAnalysis
                      points={points}
                      properties={propertyNames}
                    />
                    <button
                      onClick={() => handleExportChart('correlation', correlationRef)}
                      className="absolute top-2 right-2 p-2 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {enabledCount === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Settings2 className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-mono text-sm">
                      Select sections to include in the report
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
