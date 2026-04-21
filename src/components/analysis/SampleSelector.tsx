import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SampleSelectorProps {
  sessions: FileSession[];
  selectedSessionIds: string[];
  onSelectionChange: (sessionIds: string[]) => void;
  className?: string;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  sessions,
  selectedSessionIds,
  onSelectionChange,
  className,
}) => {
  const [query, setQuery] = useState('');

  const cleanSampleName = (fileName: string) =>
    fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/\s*_\s*/g, ' ')
      .replace(/[\s-]+[A-Z]{2,3}$/, '')
      .replace(/\s+/g, ' ')
      .trim();

  const toggleSession = (sessionId: string) => {
    if (selectedSessionIds.includes(sessionId)) {
      onSelectionChange(selectedSessionIds.filter(id => id !== sessionId));
    } else {
      onSelectionChange([...selectedSessionIds, sessionId]);
    }
  };

  const selectAll = () => onSelectionChange(sessions.map(s => s.id));
  const clearAll = () => onSelectionChange([]);

  const selectedCount = selectedSessionIds.length;
  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sessions;

    return sessions.filter(session => {
      const displayName = cleanSampleName(session.fileName).toLowerCase();
      return displayName.includes(normalizedQuery) || session.fileName.toLowerCase().includes(normalizedQuery);
    });
  }, [query, sessions]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Included Samples
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {selectedCount}/{sessions.length}
          </span>
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80">
          These samples define the scope for overview plots, tests, zones, and treatment-group analysis.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter samples…"
          className="h-8 flex-1 font-mono text-xs"
        />
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="h-8 px-2.5 text-[10px] font-mono"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2.5 text-[10px] font-mono text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted/10">
        <div className="h-full overflow-y-auto p-1.5 space-y-1">
          {filteredSessions.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-background/60 px-3 text-center">
              <p className="font-mono text-[10px] text-muted-foreground">
                No samples match the current filter.
              </p>
            </div>
          )}

          {filteredSessions.map((session, idx) => {
            const checked = selectedSessionIds.includes(session.id);
            const colorIndex = sessions.findIndex(item => item.id === session.id);
            return (
              <label
                key={session.id}
                className={cn(
                  'grid cursor-pointer grid-cols-[auto,auto,1fr] items-center gap-2 rounded-md border px-2 py-2 transition-colors',
                  checked
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-transparent bg-background/40 hover:border-border hover:bg-muted/40',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSession(session.id)}
                  className="h-3.5 w-3.5"
                />
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getSampleColor(colorIndex === -1 ? idx : colorIndex) }}
                />
                <div className="min-w-0">
                  <span
                    className="block truncate font-mono text-[11px] leading-tight"
                    title={session.fileName}
                  >
                    {cleanSampleName(session.fileName)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {session.data.points.length} points
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Consistent color palette for samples
const SAMPLE_COLORS = [
  'hsl(200, 80%, 50%)',
  'hsl(340, 80%, 50%)',
  'hsl(80, 80%, 40%)',
  'hsl(280, 80%, 50%)',
  'hsl(30, 80%, 50%)',
  'hsl(160, 80%, 40%)',
  'hsl(240, 80%, 60%)',
  'hsl(0, 80%, 50%)',
];

export const getSampleColor = (index: number): string => {
  return SAMPLE_COLORS[index % SAMPLE_COLORS.length];
};
