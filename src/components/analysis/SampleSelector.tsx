import React from 'react';
import { FileSession } from '@/types/fileSession';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const selectAll = () => {
    onSelectionChange(sessions.map(s => s.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase text-muted-foreground">
          Samples ({sessions.length})
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-xs font-mono">
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-xs font-mono text-muted-foreground">
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="h-48">
        <div className="space-y-1 pr-2">
          {sessions.map((session, idx) => (
            <label
              key={session.id}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                selectedSessionIds.includes(session.id) ? 'bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selectedSessionIds.includes(session.id)}
                onCheckedChange={() => toggleSession(session.id)}
              />
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getSampleColor(idx) }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm truncate block">{session.fileName}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {session.data.points.length} points
                </span>
              </div>
            </label>
          ))}
        </div>
      </ScrollArea>
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
