import React, { useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Users } from 'lucide-react';
import { getSampleColor } from './SampleSelector';

export interface SampleGroup {
  id: string;
  name: string;
  color: string;
  sessionIds: string[];
}

interface SampleGroupingProps {
  sessions: FileSession[];
  groups: SampleGroup[];
  onGroupsChange: (groups: SampleGroup[]) => void;
}

const GROUP_COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(0, 70%, 50%)',
  'hsl(120, 60%, 40%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(180, 60%, 40%)',
];

export const SampleGrouping: React.FC<SampleGroupingProps> = ({
  sessions,
  groups,
  onGroupsChange,
}) => {
  const [newGroupName, setNewGroupName] = useState('');

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: SampleGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      sessionIds: [],
    };
    onGroupsChange([...groups, newGroup]);
    setNewGroupName('');
  };

  const removeGroup = (groupId: string) => {
    onGroupsChange(groups.filter(g => g.id !== groupId));
  };

  const toggleSessionInGroup = (groupId: string, sessionId: string) => {
    onGroupsChange(
      groups.map(g => {
        if (g.id !== groupId) {
          // Remove from other groups if adding to this one
          return {
            ...g,
            sessionIds: g.sessionIds.filter(id => id !== sessionId),
          };
        }
        // Toggle in target group
        const isInGroup = g.sessionIds.includes(sessionId);
        return {
          ...g,
          sessionIds: isInGroup
            ? g.sessionIds.filter(id => id !== sessionId)
            : [...g.sessionIds, sessionId],
        };
      })
    );
  };

  const getSessionGroup = (sessionId: string): SampleGroup | undefined => {
    return groups.find(g => g.sessionIds.includes(sessionId));
  };

  const ungroupedSessions = sessions.filter(s => !getSessionGroup(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono text-xs uppercase text-muted-foreground">
          Treatment Groups
        </span>
      </div>

      {/* Add new group */}
      <div className="flex gap-2">
        <Input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="New group name..."
          className="h-8 text-sm font-mono"
          onKeyDown={e => e.key === 'Enter' && addGroup()}
        />
        <Button size="sm" onClick={addGroup} disabled={!newGroupName.trim()} className="h-8">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Groups */}
      <ScrollArea className="max-h-64">
        <div className="space-y-3 pr-2">
          {groups.map(group => (
            <div
              key={group.id}
              className="border-2 border-border rounded-lg p-2 space-y-2"
              style={{ borderLeftColor: group.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{group.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroup(group.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {/* Ungrouped samples to add to this group */}
              {ungroupedSessions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {ungroupedSessions.map(session => {
                    const idx = sessions.findIndex(s => s.id === session.id);
                    return (
                      <Badge
                        key={session.id}
                        variant="outline"
                        className="cursor-pointer text-xs gap-1 opacity-50 hover:opacity-100 hover:bg-muted"
                        onClick={() => toggleSessionInGroup(group.id, session.id)}
                      >
                        <Plus className="w-2 h-2" />
                        <div
                          className="w-2 h-2 rounded"
                          style={{ backgroundColor: getSampleColor(idx) }}
                        />
                        {session.fileName.replace(/\.[^/.]+$/, '')}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {group.sessionIds.length === 0 && ungroupedSessions.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No samples available
                  </span>
                ) : group.sessionIds.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    Click samples above to add
                  </span>
                ) : (
                  group.sessionIds.map(sid => {
                    const session = sessions.find(s => s.id === sid);
                    if (!session) return null;
                    const idx = sessions.findIndex(s => s.id === sid);
                    return (
                      <Badge
                        key={sid}
                        variant="secondary"
                        className="cursor-pointer text-xs gap-1"
                        onClick={() => toggleSessionInGroup(group.id, sid)}
                      >
                        <div
                          className="w-2 h-2 rounded"
                          style={{ backgroundColor: getSampleColor(idx) }}
                        />
                        {session.fileName.replace(/\.[^/.]+$/, '')}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

    </div>
  );
};

export const getGroupColor = (index: number): string => {
  return GROUP_COLORS[index % GROUP_COLORS.length];
};
