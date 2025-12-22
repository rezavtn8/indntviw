import React from 'react';
import { cn } from '@/lib/utils';

interface AppToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({ children, className }) => {
  if (!children) return null;

  return (
    <div className={cn('px-4 py-2 border-b border-border bg-card flex items-center gap-4', className)}>
      {children}
    </div>
  );
};
