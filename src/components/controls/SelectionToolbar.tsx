import React from 'react';
import { Button } from '@/components/ui/button';
import { Lasso, MousePointer2, X } from 'lucide-react';

export type SelectionMode = 'none' | 'lasso';

interface SelectionToolbarProps {
  selectionMode: SelectionMode;
  selectedCount: number;
  onModeChange: (mode: SelectionMode) => void;
  onClearSelection: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectionMode,
  selectedCount,
  onModeChange,
  onClearSelection,
}) => {
  return (
    <div className="flex items-center gap-2 border-2 border-border bg-card p-2">
      <span className="font-mono text-xs text-muted-foreground mr-2">Selection:</span>
      
      <Button
        variant={selectionMode === 'none' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('none')}
        className="gap-1 font-mono text-xs"
      >
        <MousePointer2 className="w-3 h-3" />
        Point
      </Button>
      
      <Button
        variant={selectionMode === 'lasso' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('lasso')}
        className="gap-1 font-mono text-xs"
      >
        <Lasso className="w-3 h-3" />
        Lasso
      </Button>

      {selectedCount > 0 && (
        <>
          <span className="font-mono text-xs text-primary font-bold ml-2">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-1 font-mono text-xs text-destructive hover:text-destructive"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        </>
      )}
    </div>
  );
};
