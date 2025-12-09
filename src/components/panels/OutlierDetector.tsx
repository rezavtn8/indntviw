import React, { useMemo, useState } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface OutlierDetectorProps {
  points: IndentationPoint[];
  selectedProperty: string;
  onRemoveOutliers: (pointIds: number[]) => void;
  onHighlightOutliers: (pointIds: number[]) => void;
}

export const OutlierDetector: React.FC<OutlierDetectorProps> = ({
  points,
  selectedProperty,
  onRemoveOutliers,
  onHighlightOutliers,
}) => {
  const [threshold, setThreshold] = useState(2);
  const [method, setMethod] = useState<'iqr' | 'zscore'>('zscore');
  const [showOutliers, setShowOutliers] = useState(true);

  const outliers = useMemo(() => {
    const values = points.map(p => ({
      id: p.id,
      value: p.properties[selectedProperty] ?? 0
    })).filter(v => !isNaN(v.value));

    if (values.length === 0) return [];

    if (method === 'zscore') {
      const mean = values.reduce((a, b) => a + b.value, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v.value - mean, 2), 0) / values.length
      );

      return values
        .filter(v => Math.abs(v.value - mean) > threshold * stdDev)
        .map(v => v.id);
    } else {
      // IQR method
      const sorted = [...values].sort((a, b) => a.value - b.value);
      const q1 = sorted[Math.floor(sorted.length * 0.25)].value;
      const q3 = sorted[Math.floor(sorted.length * 0.75)].value;
      const iqr = q3 - q1;
      const lower = q1 - threshold * iqr;
      const upper = q3 + threshold * iqr;

      return values
        .filter(v => v.value < lower || v.value > upper)
        .map(v => v.id);
    }
  }, [points, selectedProperty, threshold, method]);

  React.useEffect(() => {
    if (showOutliers) {
      onHighlightOutliers(outliers);
    } else {
      onHighlightOutliers([]);
    }
  }, [outliers, showOutliers, onHighlightOutliers]);

  const handleRemoveOutliers = () => {
    if (outliers.length > 0) {
      onRemoveOutliers(outliers);
      toast.success(`Removed ${outliers.length} outliers`);
    }
  };

  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h4 className="font-mono text-xs font-bold uppercase tracking-wide">
          Outlier Detection
        </h4>
      </div>

      <div className="space-y-3">
        {/* Method selection */}
        <div className="flex gap-2">
          <Button
            variant={method === 'zscore' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMethod('zscore')}
            className="flex-1 font-mono text-xs"
          >
            Z-Score
          </Button>
          <Button
            variant={method === 'iqr' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMethod('iqr')}
            className="flex-1 font-mono text-xs"
          >
            IQR
          </Button>
        </div>

        {/* Threshold slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">
              {method === 'zscore' ? 'σ Threshold' : 'IQR Multiplier'}
            </Label>
            <span className="font-mono text-xs font-bold">{threshold.toFixed(1)}</span>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([v]) => setThreshold(v)}
            min={1}
            max={4}
            step={0.1}
          />
        </div>

        {/* Show/Hide outliers */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-outliers"
            checked={showOutliers}
            onCheckedChange={(checked) => setShowOutliers(!!checked)}
          />
          <Label htmlFor="show-outliers" className="font-mono text-xs cursor-pointer">
            Highlight outliers
          </Label>
        </div>

        {/* Stats and actions */}
        <div className="border-t border-border pt-2 space-y-2">
          <div className="font-mono text-xs text-muted-foreground">
            {outliers.length} outlier{outliers.length !== 1 ? 's' : ''} detected in {selectedProperty}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveOutliers}
            disabled={outliers.length === 0}
            className="w-full gap-1 font-mono text-xs"
          >
            <Trash2 className="w-3 h-3" />
            Remove Outliers
          </Button>
        </div>
      </div>
    </div>
  );
};
