import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit3, Plus, Undo2, Redo2, Trash2, RotateCcw } from 'lucide-react';
import { ExportControls } from '@/components/controls/ExportControls';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { IndentationData } from '@/types/indentation';

interface AppToolbarProps {
  children?: React.ReactNode;
  className?: string;
  // Editing controls
  isEditing?: boolean;
  onToggleEditing?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  hasChanges?: boolean;
  onReset?: () => void;
  onAddPoint?: () => void;
  selectedPointCount?: number;
  onBulkDelete?: () => void;
  // Export
  data?: IndentationData | null;
  visualizationRef?: React.RefObject<HTMLDivElement>;
  selectedProperty?: string;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  children,
  className,
  isEditing,
  onToggleEditing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasChanges,
  onReset,
  onAddPoint,
  selectedPointCount = 0,
  onBulkDelete,
  data,
  visualizationRef,
  selectedProperty,
}) => {
  const showEditingTools = onToggleEditing !== undefined;
  const showExport = data && visualizationRef && selectedProperty !== undefined;

  return (
    <div className={cn('px-3 py-1.5 border-b border-border bg-card flex items-center gap-2', className)}>
      {/* 1. View-specific tools (zone toolbar, etc.) */}
      {children}

      {/* Divider after view tools if both view tools and editing tools exist */}
      {children && showEditingTools && data && (
        <Separator orientation="vertical" className="h-4 mx-0.5" />
      )}

      {/* 2. Editing tools */}
      {showEditingTools && data && (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditing ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleEditing}
                className="h-7 gap-1 text-xs px-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle Edit Mode</TooltipContent>
          </Tooltip>

          {isEditing && (
            <>
              <Separator orientation="vertical" className="h-4 mx-0.5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} disabled={!canUndo}>
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRedo} disabled={!canRedo}>
                    <Redo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-4 mx-0.5" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={onAddPoint}>
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add New Point</TooltipContent>
              </Tooltip>

              {selectedPointCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 gap-1 text-xs px-2"
                  onClick={onBulkDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {selectedPointCount}
                </Button>
              )}
            </>
          )}

          {hasChanges && !isEditing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={onReset}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset data to original</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* 3. Export controls */}
      {showExport && (
        <>
          <Separator orientation="vertical" className="h-4 mx-0.5" />
          <ExportControls data={data} visualizationRef={visualizationRef} selectedProperty={selectedProperty} />
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* 4. Point count */}
      {data && (
        <span className="font-mono text-xs text-muted-foreground">{data.points.length} pts</span>
      )}
    </div>
  );
};
