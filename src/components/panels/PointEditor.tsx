import React, { useState, useEffect } from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PointEditorProps {
  point: IndentationPoint | null;
  isNewPoint?: boolean;
  onSave: (point: IndentationPoint) => void;
  onDelete: (pointId: number) => void;
  onClose: () => void;
}

export const PointEditor: React.FC<PointEditorProps> = ({ 
  point, 
  isNewPoint = false,
  onSave, 
  onDelete, 
  onClose 
}) => {
  const [editedPoint, setEditedPoint] = useState<IndentationPoint | null>(null);

  useEffect(() => {
    if (point) {
      setEditedPoint({ ...point, properties: { ...point.properties } });
    }
  }, [point]);

  if (!editedPoint) return null;

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedPoint({ ...editedPoint, [axis]: numValue });
    }
  };

  const handlePropertyChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedPoint({
        ...editedPoint,
        properties: { ...editedPoint.properties, [key]: numValue }
      });
    }
  };

  const handleSave = () => {
    onSave(editedPoint);
    toast.success(isNewPoint ? 'Point added' : 'Point updated');
    onClose();
  };

  const handleDelete = () => {
    onDelete(editedPoint.id);
    toast.success('Point removed');
    onClose();
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  return (
    <div className="border-2 border-border bg-card shadow-md">
      <div className="flex items-center justify-between border-b-2 border-border p-3">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wide">
          {isNewPoint ? 'Add New Point' : `Edit Point #${editedPoint.id + 1}`}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Position */}
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Position
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="space-y-1">
                <Label className="font-mono text-xs uppercase">{axis} (mm)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editedPoint[axis]}
                  onChange={(e) => handlePositionChange(axis, e.target.value)}
                  className="font-mono text-sm h-8"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Properties */}
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Properties
          </h4>
          <div className="space-y-2">
            {Object.entries(editedPoint.properties).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Label className="font-mono text-xs w-20 truncate" title={key}>
                  {key}
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={value}
                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                  className="font-mono text-sm h-8 flex-1"
                />
                {getPropertyUnit(key) && (
                  <span className="font-mono text-xs text-muted-foreground w-12">
                    {getPropertyUnit(key)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} size="sm" className="flex-1 gap-1">
            <Save className="w-3 h-3" />
            {isNewPoint ? 'Add' : 'Save'}
          </Button>
          {!isNewPoint && (
            <Button onClick={handleDelete} variant="destructive" size="sm" className="gap-1">
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
