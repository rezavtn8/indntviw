import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { 
  FileDown, 
  FileText, 
  Image as ImageIcon, 
  Settings2, 
  BarChart3, 
  Loader2,
  CheckCircle,
  Download,
  TrendingUp,
  PieChart,
  FlaskConical,
  Grid3X3,
  AlertCircle,
  Info
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
  description: string;
  icon: React.ReactNode;
  ref: React.RefObject<HTMLDivElement>;
  available: boolean;
}

interface GenerationProgress {
  current: number;
  total: number;
  stage: string;
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
  const [authorName, setAuthorName] = useState('');
  const [quality, setQuality] = useState<'screen' | 'print'>('print');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [showPValueAsterisks, setShowPValueAsterisks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  
  // Section toggles
  const [enabledSections, setEnabledSections] = useState({
    stats: true,
    boxplot: true,
    distribution: true,
    tests: true,
    correlation: true,
  });
  
  // Refs for chart elements (for capture)
  const statsRef = useRef<HTMLDivElement>(null);
  const boxplotRef = useRef<HTMLDivElement>(null);
  const distributionRef = useRef<HTMLDivElement>(null);
  const testsRef = useRef<HTMLDivElement>(null);
  const correlationRef = useRef<HTMLDivElement>(null);
  
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };
  
  // Determine which sections are available based on data
  const canShowTests = data.length >= 2;
  const canShowCorrelation = propertyNames.length >= 2 && points.length > 0;
  
  const sections: SectionConfig[] = useMemo(() => [
    { 
      id: 'stats', 
      label: 'Descriptive Statistics', 
      description: 'Mean, SD, CI, quartiles',
      icon: <BarChart3 className="w-4 h-4" />, 
      ref: statsRef,
      available: true 
    },
    { 
      id: 'boxplot', 
      label: 'Box/Violin Plots', 
      description: 'Distribution visualization',
      icon: <TrendingUp className="w-4 h-4" />, 
      ref: boxplotRef,
      available: true 
    },
    { 
      id: 'distribution', 
      label: 'Distribution Analysis', 
      description: 'Histograms & density',
      icon: <PieChart className="w-4 h-4" />, 
      ref: distributionRef,
      available: true 
    },
    { 
      id: 'tests', 
      label: 'Statistical Tests', 
      description: 'ANOVA, t-tests, p-values',
      icon: <FlaskConical className="w-4 h-4" />, 
      ref: testsRef,
      available: canShowTests 
    },
    { 
      id: 'correlation', 
      label: 'Correlation Matrix', 
      description: 'Property relationships',
      icon: <Grid3X3 className="w-4 h-4" />, 
      ref: correlationRef,
      available: canShowCorrelation 
    },
  ], [canShowTests, canShowCorrelation]);
  
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
      tests: canShowTests,
      correlation: canShowCorrelation,
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
  
  const enabledCount = Object.entries(enabledSections).filter(([key, val]) => {
    const section = sections.find(s => s.id === key);
    return val && section?.available;
  }).length;

  // Calculate total data points
  const totalPoints = useMemo(() => 
    data.reduce((sum, d) => sum + d.stats.n, 0), [data]
  );

  // Estimate PDF pages
  const estimatedPages = useMemo(() => {
    let pages = 1; // Title page
    if (enabledSections.stats) pages += 1;
    if (enabledSections.boxplot) pages += 1;
    if (enabledSections.distribution) pages += 1;
    if (enabledSections.tests && canShowTests) pages += 1;
    if (enabledSections.correlation && canShowCorrelation) pages += 1;
    if (includeRawData) pages += Math.ceil(data.length / 3);
    return pages;
  }, [enabledSections, includeRawData, data.length, canShowTests, canShowCorrelation]);
  
  // Generate PDF report
  const handleGeneratePDF = useCallback(async () => {
    setIsGenerating(true);
    setProgress({ current: 0, total: enabledCount + 2, stage: 'Preparing...' });
    
    try {
      // Wait for charts to render
      await new Promise(r => setTimeout(r, 500));
      setProgress({ current: 1, total: enabledCount + 2, stage: 'Capturing charts...' });
      
      // Collect chart elements
      const chartElements = new Map<string, HTMLElement>();
      
      if (enabledSections.stats && statsRef.current) {
        chartElements.set('stats', statsRef.current);
      }
      if (enabledSections.boxplot && boxplotRef.current) {
        chartElements.set('boxplot', boxplotRef.current);
      }
      if (enabledSections.distribution && distributionRef.current) {
        chartElements.set('distribution', distributionRef.current);
      }
      if (enabledSections.tests && testsRef.current && canShowTests) {
        chartElements.set('tests', testsRef.current);
      }
      if (enabledSections.correlation && correlationRef.current && canShowCorrelation) {
        chartElements.set('correlation', correlationRef.current);
      }
      
      setProgress({ current: 2, total: enabledCount + 2, stage: 'Generating PDF...' });
      
      const options: ReportOptions = {
        title: reportTitle,
        author: authorName,
        selectedProperty,
        quality,
        pageSize,
        orientation,
        includeRawData,
        includeSummary,
      };
      
      await generateAnalysisPDF(data as AnalysisData[], chartElements, options);
      
      setProgress({ current: enabledCount + 2, total: enabledCount + 2, stage: 'Complete!' });
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(null);
      }, 1500);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setProgress({ current: 0, total: 0, stage: 'Failed - please try again' });
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(null);
      }, 2000);
    }
  }, [data, selectedProperty, reportTitle, authorName, quality, pageSize, orientation, includeRawData, includeSummary, enabledSections, enabledCount, canShowTests, canShowCorrelation]);
  
  // Export individual chart
  const handleExportChart = useCallback(async (chartId: string, ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const filename = `${chartId}_${selectedProperty}_${new Date().toISOString().split('T')[0]}.png`;
    await exportChartAsPNG(ref.current, filename, quality);
  }, [selectedProperty, quality]);
  
  // Export all charts as ZIP
  const handleExportAllCharts = useCallback(async () => {
    setIsGenerating(true);
    setProgress({ current: 0, total: enabledCount, stage: 'Preparing charts...' });
    
    const chartElements = new Map<string, HTMLElement>();
    if (enabledSections.stats && statsRef.current) {
      chartElements.set('descriptive_stats', statsRef.current);
    }
    if (enabledSections.boxplot && boxplotRef.current) {
      chartElements.set('box_violin_plot', boxplotRef.current);
    }
    if (enabledSections.distribution && distributionRef.current) {
      chartElements.set('distribution', distributionRef.current);
    }
    if (enabledSections.tests && testsRef.current && canShowTests) {
      chartElements.set('statistical_tests', testsRef.current);
    }
    if (enabledSections.correlation && correlationRef.current && canShowCorrelation) {
      chartElements.set('correlation_matrix', correlationRef.current);
    }
    
    setProgress({ current: 1, total: 2, stage: 'Creating ZIP...' });
    
    await exportChartsAsZIP(chartElements, quality, selectedProperty);
    
    setProgress({ current: 2, total: 2, stage: 'Done!' });
    setTimeout(() => {
      setIsGenerating(false);
      setProgress(null);
    }, 1000);
  }, [enabledSections, quality, selectedProperty, enabledCount, canShowTests, canShowCorrelation]);
  
  if (data.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Analysis Report
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-mono text-sm mb-2">
              No data selected for analysis
            </p>
            <p className="text-muted-foreground/70 font-mono text-xs">
              Enable "All Data" or select zones first, then return here.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 !flex !flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 h-full overflow-hidden">
          {/* Left Panel - Settings */}
          <div className="w-80 border-r border-border bg-muted/30 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Report Generator
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Create publication-ready analysis reports
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Report Metadata */}
                <div className="space-y-3">
                  <Label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Report Details
                  </Label>
                  <div className="space-y-2">
                    <Input
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Report title..."
                      className="font-mono text-sm"
                    />
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Author name (optional)"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                
                {/* Data Summary Card */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted-foreground">Analyzing</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {data.length} zone{data.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm font-bold">{getPropertyLabel(selectedProperty)}</p>
                  {getPropertyUnit(selectedProperty) && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Unit: {getPropertyUnit(selectedProperty)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="font-mono text-xs text-muted-foreground">Total points</span>
                    <span className="font-mono text-xs font-medium">{totalPoints.toLocaleString()}</span>
                  </div>
                </div>
                
                <Separator />
                
                {/* Sections to Include */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">
                      Report Sections
                    </Label>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllSections}
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        All
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        onClick={clearAllSections}
                        className="text-xs text-muted-foreground hover:underline font-mono"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          !section.available 
                            ? 'opacity-50 cursor-not-allowed'
                            : enabledSections[section.id as keyof typeof enabledSections]
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <Checkbox
                          checked={section.available && enabledSections[section.id as keyof typeof enabledSections]}
                          onCheckedChange={() => section.available && toggleSection(section.id)}
                          disabled={!section.available}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {section.icon}
                            <span className="font-mono text-sm">{section.label}</span>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">
                            {section.description}
                          </p>
                          {!section.available && (
                            <p className="font-mono text-xs text-amber-500 mt-1">
                              {section.id === 'tests' ? 'Requires 2+ zones' : 'Requires 2+ properties'}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Export Settings */}
                <div className="space-y-4">
                  <Label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-1">
                    <Settings2 className="w-3 h-3" />
                    Export Settings
                  </Label>
                  
                  {/* Quality */}
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Image Quality</Label>
                    <RadioGroup value={quality} onValueChange={(v) => setQuality(v as 'screen' | 'print')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="screen" id="screen" />
                        <Label htmlFor="screen" className="font-mono text-sm cursor-pointer">
                          Screen (150 DPI) - Faster
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="print" id="print" />
                        <Label htmlFor="print" className="font-mono text-sm cursor-pointer">
                          Print (300 DPI) - Publication
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Page Settings */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs">Page Size</Label>
                      <Select value={pageSize} onValueChange={(v) => setPageSize(v as 'a4' | 'letter')}>
                        <SelectTrigger className="font-mono text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a4">A4</SelectItem>
                          <SelectItem value="letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs">Orientation</Label>
                      <Select value={orientation} onValueChange={(v) => setOrientation(v as 'portrait' | 'landscape')}>
                        <SelectTrigger className="font-mono text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Additional Options */}
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={includeSummary}
                        onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                      />
                      <span className="font-mono text-sm">Include executive summary</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={showPValueAsterisks}
                        onCheckedChange={(checked) => setShowPValueAsterisks(checked as boolean)}
                      />
                      <span className="font-mono text-sm">Show p-value asterisks on plots</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={includeRawData}
                        onCheckedChange={(checked) => setIncludeRawData(checked as boolean)}
                      />
                      <span className="font-mono text-sm">Include raw data sample</span>
                    </label>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            {/* Export Buttons */}
            <div className="p-4 border-t border-border bg-background space-y-3">
              {/* Progress Indicator */}
              {isGenerating && progress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-mono">
                    {progress.stage === 'Complete!' || progress.stage === 'Done!' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span className="text-muted-foreground">{progress.stage}</span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
                </div>
              )}
              
              {/* Estimate */}
              {!isGenerating && (
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Est. {estimatedPages} page{estimatedPages !== 1 ? 's' : ''}</span>
                  <span>{enabledCount} section{enabledCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              
              <Button
                onClick={handleGeneratePDF}
                disabled={isGenerating || enabledCount === 0}
                className="w-full gap-2 font-mono"
                size="lg"
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
                Export All Charts (ZIP)
              </Button>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="flex-1 bg-background overflow-hidden flex flex-col min-w-0">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-mono text-sm font-bold">Live Preview</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {quality === 'print' ? 'High quality (300 DPI)' : 'Screen quality (150 DPI)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {orientation === 'landscape' ? '↔' : '↕'} {pageSize.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  {enabledCount}/{sections.filter(s => s.available).length} sections
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6 max-w-5xl mx-auto">
                {/* Descriptive Statistics */}
                {enabledSections.stats && (
                  <div ref={statsRef} className="relative group bg-background rounded-lg">
                    <DescriptiveStats
                      stats={data}
                      selectedProperty={selectedProperty}
                    />
                    <button
                      onClick={() => handleExportChart('descriptive_stats', statsRef)}
                      className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Box Plots */}
                {enabledSections.boxplot && (
                  <div ref={boxplotRef} className="relative group bg-background rounded-lg">
                    <BoxViolinPlots
                      data={data}
                      selectedProperty={selectedProperty}
                      showViolin={showViolin}
                      showJitter={showJitter}
                      showPValueAsterisks={showPValueAsterisks}
                    />
                    <button
                      onClick={() => handleExportChart('box_violin_plot', boxplotRef)}
                      className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Distribution Plots */}
                {enabledSections.distribution && (
                  <div ref={distributionRef} className="relative group bg-background rounded-lg">
                    <DistributionPlots
                      data={data}
                      selectedProperty={selectedProperty}
                    />
                    <button
                      onClick={() => handleExportChart('distribution', distributionRef)}
                      className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Statistical Tests */}
                {enabledSections.tests && canShowTests && (
                  <div ref={testsRef} className="relative group bg-background rounded-lg">
                    <StatisticalTests
                      data={data}
                      selectedProperty={selectedProperty}
                    />
                    <button
                      onClick={() => handleExportChart('statistical_tests', testsRef)}
                      className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Correlation Analysis */}
                {enabledSections.correlation && canShowCorrelation && (
                  <div ref={correlationRef} className="relative group bg-background rounded-lg">
                    <CorrelationAnalysis
                      points={points}
                      properties={propertyNames}
                    />
                    <button
                      onClick={() => handleExportChart('correlation_matrix', correlationRef)}
                      className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      title="Export as PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {enabledCount === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 gap-4 border-2 border-dashed border-border rounded-lg">
                    <Settings2 className="w-12 h-12 text-muted-foreground/30" />
                    <div className="text-center">
                      <p className="text-muted-foreground font-mono text-sm mb-1">
                        No sections selected
                      </p>
                      <p className="text-muted-foreground/70 font-mono text-xs">
                        Select sections from the left panel to preview
                      </p>
                    </div>
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
