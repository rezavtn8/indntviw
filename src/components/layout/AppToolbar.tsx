import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Trash2, Save, FolderOpen, Edit3, Plus, Undo2, Redo2, RotateCcw } from 'lucide-react';
import { ExportControls } from '@/components/controls/ExportControls';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  const { clearWorkspace, fileSessions, saveProjectFile, loadProjectFile } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadProjectFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasFiles = fileSessions.length > 0;
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

      {/* 5. Project actions — compact icon-only buttons */}
      <div className="flex items-center gap-0.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".indentview"
          className="hidden"
          onChange={handleFileSelected}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleOpenProject}
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Open Project (.indentview)</TooltipContent>
        </Tooltip>

        {hasFiles && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={saveProjectFile}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save Project</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear Workspace</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all open files, zones, and treatment groups. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearWorkspace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
};
