import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MousePointer2, Lasso, Square, Trash2, PlusCircle, X } from 'lucide-react';

export type DrawingTool = 'select' | 'lasso' | 'box';

interface ZoneToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onDeleteSelected: () => void;
  onCreateZone: () => void;
  onClearSelection: () => void;
  hasSelectedZone: boolean;
  hasSelectedPoints: boolean;
  selectedPointCount: number;
}

export const ZoneToolbar: React.FC<ZoneToolbarProps> = ({
  activeTool,
  onToolChange,
  onDeleteSelected,
  onCreateZone,
  onClearSelection,
  hasSelectedZone,
  hasSelectedPoints,
  selectedPointCount,
}) => {
  const tools: { id: DrawingTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Click to Select', shortcut: 'V' },
    { id: 'lasso', icon: <Lasso className="w-4 h-4" />, label: 'Lasso Select', shortcut: 'L' },
    { id: 'box', icon: <Square className="w-4 h-4" />, label: 'Box Select', shortcut: 'B' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg">
        {tools.map(tool => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onToolChange(tool.id)}
                className="w-9 h-9 p-0"
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label} ({tool.shortcut})</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />

        {/* Selection info and actions */}
        {selectedPointCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm font-mono">
            <span className="text-primary font-semibold">{selectedPointCount}</span>
            <span className="text-muted-foreground">pts</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="w-5 h-5 p-0 ml-1 hover:bg-destructive/20"
                >
                  <X className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Clear Selection (Esc)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasSelectedPoints ? 'default' : 'outline'}
              size="sm"
              onClick={onCreateZone}
              disabled={!hasSelectedPoints}
              className="gap-1.5 px-3"
            >
              <PlusCircle className="w-4 h-4" />
              Create Zone
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{hasSelectedPoints ? `Create zone from ${selectedPointCount} selected points` : 'Select points first'}</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteSelected}
              disabled={!hasSelectedZone}
              className="w-9 h-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Delete Zone (Del)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
