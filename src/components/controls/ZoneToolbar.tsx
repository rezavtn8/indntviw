import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MousePointer2, Lasso, Square, Trash2, PlusCircle } from 'lucide-react';

export type DrawingTool = 'select' | 'lasso' | 'box';

interface ZoneToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onDeleteSelected: () => void;
  onCreateZone: () => void;
  hasSelectedZone: boolean;
  hasSelectedPoints: boolean;
  selectedPointCount: number;
}

export const ZoneToolbar: React.FC<ZoneToolbarProps> = ({
  activeTool,
  onToolChange,
  onDeleteSelected,
  onCreateZone,
  hasSelectedZone,
  hasSelectedPoints,
  selectedPointCount,
}) => {
  const tools: { id: DrawingTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select Points', shortcut: 'V' },
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
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={onCreateZone}
              disabled={!hasSelectedPoints}
              className="gap-1 px-3"
            >
              <PlusCircle className="w-4 h-4" />
              Create Zone
              {selectedPointCount > 0 && (
                <span className="ml-1 text-xs bg-background/20 px-1.5 rounded">
                  {selectedPointCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Create zone from selected points</p>
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
