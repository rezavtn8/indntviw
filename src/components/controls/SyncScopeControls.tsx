import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link2, User, Wand2 } from 'lucide-react';

interface SyncScopeControlsProps {
  /** True when the active session uses its own per-tab color scheme + range. */
  overrideColorRange: boolean;
  onOverrideChange: (override: boolean) => void;
  /** Auto-fit the global range to encompass all open samples. */
  onAutoFitAll: () => void;
  /** How many tabs are open — controls whether multi-sample helpers are shown. */
  sessionCount: number;
}

export const SyncScopeControls: React.FC<SyncScopeControlsProps> = ({
  overrideColorRange,
  onOverrideChange,
  onAutoFitAll,
  sessionCount,
}) => {
  const isMulti = sessionCount > 1;

  return (
    <div className="space-y-2 p-2 border border-border rounded-md bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {overrideColorRange ? (
            <User className="w-3.5 h-3.5 text-foreground shrink-0" />
          ) : (
            <Link2 className="w-3.5 h-3.5 text-foreground shrink-0" />
          )}
          <label className="font-mono text-[11px] uppercase tracking-wide truncate">
            {overrideColorRange ? 'This sample only' : 'Synced across tabs'}
          </label>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch
              checked={overrideColorRange}
              onCheckedChange={(v) => onOverrideChange(!!v)}
            />
          </TooltipTrigger>
          <TooltipContent side="left" className="font-mono text-xs max-w-[220px]">
            {overrideColorRange
              ? 'This sample uses its own color scheme and range.'
              : 'Color scheme and range are shared with all open tabs.'}
          </TooltipContent>
        </Tooltip>
      </div>

      {!overrideColorRange && isMulti && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAutoFitAll}
          className="w-full h-7 font-mono text-[11px] gap-1.5"
        >
          <Wand2 className="w-3 h-3" />
          Auto-fit to all {sessionCount} samples
        </Button>
      )}
    </div>
  );
};
