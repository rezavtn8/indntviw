import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Trash2, Save, FolderOpen } from 'lucide-react';
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

interface AppToolbarProps {
  children?: React.ReactNode;
  className?: string;
  showClearWorkspace?: boolean;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({ children, className, showClearWorkspace = false }) => {
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
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!children && !showClearWorkspace) return null;
  const hasFiles = fileSessions.length > 0;

  return (
    <div className={cn('px-4 py-2 border-b border-border bg-card flex items-center gap-4', className)}>
      {children}
      
      {showClearWorkspace && (
        <div className="ml-auto flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".indentview"
            className="hidden"
            onChange={handleFileSelected}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleOpenProject}>
                <FolderOpen className="w-4 h-4 mr-1" />
                Open Project
              </Button>
            </TooltipTrigger>
            <TooltipContent>Load a saved .indentview project file</TooltipContent>
          </Tooltip>

          {fileSessions.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={saveProjectFile}>
                    <Save className="w-4 h-4 mr-1" />
                    Save Project
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download workspace as .indentview file</TooltipContent>
              </Tooltip>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Workspace
                  </Button>
                </AlertDialogTrigger>
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
      )}
    </div>
  );
};
