import React from 'react';
import { FileSession } from '@/types/fileSession';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface SampleSelectorProps {
  sessions: FileSession[];
  selectedSessionIds: string[];
  onSelectionChange: (sessionIds: string[]) => void;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  sessions,
  selectedSessionIds,
  onSelectionChange,
}) => {
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Samples
          <span className="ml-1.5 tabular-nums text-foreground/70">
            {selectedCount}/{sessions.length}
          </span>
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="h-5 px-1.5 text-[10px] font-mono"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Native scroll container — nested Radix ScrollAreas inside another ScrollArea
          fail to constrain height, which previously hid most samples. */}
      <div className="h-56 overflow-y-auto rounded-md border border-border bg-muted/10">
        <div className="p-1 space-y-0.5">
          {sessions.map((session, idx) => {
            const checked = selectedSessionIds.includes(session.id);
            return (
              <label
                key={session.id}
                className={`flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer transition-colors ${
                  checked ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSession(session.id)}
                  className="h-3.5 w-3.5"
                />
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getSampleColor(idx) }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="font-mono text-[11px] truncate block leading-tight"
                    title={session.fileName}
                  >
                    {session.fileName.replace(/\.[^/.]+$/, '')}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
                    {session.data.points.length} pts
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
