import React, { useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Users, AlertCircle } from 'lucide-react';
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
  'hsl(220, 70%, 50%)', 'hsl(0, 70%, 50%)', 'hsl(120, 60%, 40%)',
  'hsl(45, 80%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 40%)',
  'hsl(330, 70%, 50%)', 'hsl(90, 60%, 40%)', 'hsl(200, 70%, 45%)',
];

export const SampleGrouping: React.FC<SampleGroupingProps> = ({ sessions, groups, onGroupsChange }) => {
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
          return { ...g, sessionIds: g.sessionIds.filter(id => id !== sessionId) };
        }
        const isInGroup = g.sessionIds.includes(sessionId);
        return { ...g, sessionIds: isInGroup ? g.sessionIds.filter(id => id !== sessionId) : [...g.sessionIds, sessionId] };
      })
    );
  };

  const getSessionGroup = (sessionId: string) => groups.find(g => g.sessionIds.includes(sessionId));
  const ungroupedSessions = sessions.filter(s => !getSessionGroup(s.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase text-muted-foreground">Treatment Groups</span>
      </div>

      {/* Add new group */}
      <div className="flex gap-1">
        <Input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="Group name..."
          className="h-6 text-xs font-mono flex-1"
          onKeyDown={e => e.key === 'Enter' && addGroup()}
        />
        <Button size="sm" onClick={addGroup} disabled={!newGroupName.trim()} className="h-6 px-2">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Groups list */}
      <ScrollArea className="h-48">
        <div className="space-y-2 pr-1">
          {groups.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic text-center py-2">
              No groups created yet
            </p>
          )}
          {groups.map(group => {
            const hasMembers = group.sessionIds.length > 0;
            return (
              <div
                key={group.id}
                className="border border-border rounded p-1.5 space-y-1"
                style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold truncate max-w-[120px]">{group.name}</span>
                  <div className="flex items-center gap-1">
                    {!hasMembers && <AlertCircle className="w-3 h-3 text-amber-500" />}
                    <span className="text-[10px] text-muted-foreground">{group.sessionIds.length}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeGroup(group.id)} className="h-5 w-5 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Ungrouped samples */}
                {ungroupedSessions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ungroupedSessions.map(session => {
                      const idx = sessions.findIndex(s => s.id === session.id);
                      return (
                        <Badge
                          key={session.id}
                          variant="outline"
                          className="cursor-pointer text-[10px] gap-0.5 opacity-50 hover:opacity-100 h-5 px-1"
                          onClick={() => toggleSessionInGroup(group.id, session.id)}
                        >
                          <Plus className="w-2 h-2" />
                          <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: getSampleColor(idx) }} />
                          <span className="truncate max-w-[60px]">{session.fileName.replace(/\.[^/.]+$/, '')}</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Group members */}
                <div className="flex flex-wrap gap-1">
                  {group.sessionIds.length === 0 && ungroupedSessions.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">No samples</span>
                  )}
                  {group.sessionIds.map(sid => {
                    const session = sessions.find(s => s.id === sid);
                    if (!session) return null;
                    const idx = sessions.findIndex(s => s.id === sid);
                    return (
                      <Badge
                        key={sid}
                        variant="secondary"
                        className="cursor-pointer text-[10px] gap-0.5 h-5 px-1"
                        onClick={() => toggleSessionInGroup(group.id, sid)}
                      >
                        <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: getSampleColor(idx) }} />
                        <span className="truncate max-w-[60px]">{session.fileName.replace(/\.[^/.]+$/, '')}</span>
                        <X className="w-2 h-2" />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export const getGroupColor = (index: number): string => GROUP_COLORS[index % GROUP_COLORS.length];
