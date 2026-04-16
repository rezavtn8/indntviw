import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/components/layout/Brand';

export type StatusTone = 'good' | 'neutral' | 'warn' | 'info';

interface StatusChipProps {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Brand-aware status badge. Uses the platform's navy/teal/coral palette
 * instead of raw Tailwind green/red so analysis chips stay on-brand.
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  tone = 'neutral',
  children,
  className,
}) => {
  const styles = (() => {
    switch (tone) {
      case 'good':
        return { background: `${BRAND.teal}26`, color: BRAND.teal, border: `${BRAND.teal}66` };
      case 'warn':
        return { background: `${BRAND.coral}26`, color: BRAND.coral, border: `${BRAND.coral}66` };
      case 'info':
        return { background: `${BRAND.navy}26`, color: BRAND.navy, border: `${BRAND.navy}66` };
      default:
        return undefined;
    }
  })();

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border',
        tone === 'neutral' && 'bg-muted/50 text-muted-foreground border-border',
        className
      )}
      style={styles ? { ...styles, borderColor: styles.border } : undefined}
    >
      {children}
    </span>
  );
};
