import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContextPanelProps {
  title?: string;
  isOpen?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  title,
  isOpen = true,
  onClose,
  children,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <aside className={cn('w-72 border-l border-border bg-card overflow-y-auto', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
            {title}
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      <div className="p-4 space-y-4">
        {children}
      </div>
    </aside>
  );
};
