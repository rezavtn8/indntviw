import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link2, User, Wand2, ChevronDown } from 'lucide-react';

interface SyncScopeControlsProps {
  /** True when the active session uses its own per-tab color scheme + range. */
  overrideColorRange: boolean;
  onOverrideChange: (override: boolean) => void;
  /** Auto-fit the global range to encompass all open samples. */
  onAutoFitAll: (mode?: 'robust' | 'absolute') => void;
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {overrideColorRange ? (
            <User className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground truncate">
            {overrideColorRange ? 'Per-Sample Range' : 'Synced Range'}
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

      {isMulti && (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAutoFitAll('robust')}
            className="flex-1 h-7 font-mono text-[11px] gap-1.5"
            title="Fit to 1st–99th percentile of all samples (ignores extreme outliers)"
          >
            <Wand2 className="w-3 h-3" />
            Fit to all {sessionCount}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                title="Fit options"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Fit range
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onAutoFitAll('robust')}>
                <Wand2 className="w-3 h-3 mr-2" />
                Robust (1–99%)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAutoFitAll('absolute')}>
                <Wand2 className="w-3 h-3 mr-2" />
                Absolute (min–max)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
                Robust ignores outliers for clearer color contrast. Absolute uses the full data extent.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {isMulti && overrideColorRange && (
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          Auto-fit will switch this sample back to the synced range.
        </p>
      )}
    </div>
  );
};
