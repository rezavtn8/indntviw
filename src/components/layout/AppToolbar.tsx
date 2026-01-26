import React from 'react';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

interface AppToolbarProps {
  children?: React.ReactNode;
  className?: string;
  showClearWorkspace?: boolean;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({ children, className, showClearWorkspace = false }) => {
  const { clearWorkspace, fileSessions } = useSession();

  if (!children && !showClearWorkspace) return null;

  return (
    <div className={cn('px-4 py-2 border-b border-border bg-card flex items-center gap-4', className)}>
      {children}
      
      {showClearWorkspace && fileSessions.length > 0 && (
        <div className="ml-auto">
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
        </div>
      )}
    </div>
  );
};
