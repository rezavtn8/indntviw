import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MousePointer2, Lasso, Circle, Square, Trash2 } from 'lucide-react';

export type DrawingTool = 'select' | 'lasso' | 'ellipse' | 'rectangle';

interface ZoneToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onDeleteSelected: () => void;
  hasSelectedZone: boolean;
}

export const ZoneToolbar: React.FC<ZoneToolbarProps> = ({
  activeTool,
  onToolChange,
  onDeleteSelected,
  hasSelectedZone,
}) => {
  const tools: { id: DrawingTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', shortcut: 'V' },
    { id: 'lasso', icon: <Lasso className="w-4 h-4" />, label: 'Freeform', shortcut: 'L' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: 'Ellipse', shortcut: 'E' },
    { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R' },
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
