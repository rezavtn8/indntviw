import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from './Brand';

export interface SegmentedTab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Compact segmented mode-switcher used across views (Analysis, Export).
 * Active tab gets a brand-teal underline; inactive tabs are subtle.
 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeId,
  onChange,
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-0 border-b border-border', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors -mb-px',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
            {isActive && (
              <span
                className="absolute left-0 right-0 bottom-0 h-[2px]"
                style={{ background: BRAND.teal }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
