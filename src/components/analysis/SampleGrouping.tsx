import React, { useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  X,
  Users,
  AlertCircle,
  MoreHorizontal,
  FolderInput,
  Inbox,
  Pencil,
  Check,
} from 'lucide-react';
import { getSampleColor } from './SampleSelector';
import { cn } from '@/lib/utils';

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

const cleanName = (n: string) => n.replace(/\.[^/.]+$/, '');

export const SampleGrouping: React.FC<SampleGroupingProps> = ({ sessions, groups, onGroupsChange }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const newGroup: SampleGroup = {
      id: `group-${Date.now()}`,
      name,
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      sessionIds: [],
    };
    onGroupsChange([...groups, newGroup]);
    setNewGroupName('');
  };

  const removeGroup = (groupId: string) =>
    onGroupsChange(groups.filter(g => g.id !== groupId));

  const renameGroup = (groupId: string, name: string) => {
    onGroupsChange(groups.map(g => (g.id === groupId ? { ...g, name } : g)));
  };

  // Move (or unassign) a sample to a target group. Removes from any other group first.
  const moveSampleTo = (sessionId: string, targetGroupId: string | null) => {
    onGroupsChange(
      groups.map(g => {
        const without = g.sessionIds.filter(id => id !== sessionId);
        if (g.id === targetGroupId) {
          return { ...g, sessionIds: [...without, sessionId] };
        }
        return { ...g, sessionIds: without };
      }),
    );
  };

  // Assign every ungrouped sample evenly across existing groups (round-robin).
  const autoDistribute = () => {
    if (groups.length === 0) return;
    const ungrouped = sessions.filter(s => !groups.some(g => g.sessionIds.includes(s.id)));
    if (ungrouped.length === 0) return;
    const next = groups.map(g => ({ ...g, sessionIds: [...g.sessionIds] }));
    ungrouped.forEach((s, i) => {
      next[i % next.length].sessionIds.push(s.id);
    });
    onGroupsChange(next);
  };

  const clearAll = () => {
    onGroupsChange(groups.map(g => ({ ...g, sessionIds: [] })));
  };

  const getSessionGroup = (sessionId: string) =>
    groups.find(g => g.sessionIds.includes(sessionId));

  const ungroupedSessions = sessions.filter(s => !getSessionGroup(s.id));

  const totalAssigned = sessions.length - ungroupedSessions.length;

  return (
    <div className="space-y-2">
      {/* Summary line — outer Collapsible already shows the "Treatment Groups" label */}
      <div className="flex items-center justify-end">
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {totalAssigned}/{sessions.length} assigned
        </span>
      </div>

      {/* Add new group */}
      <div className="flex gap-1.5">
        <Input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="New group name…"
          className="h-7 text-xs font-mono flex-1"
          onKeyDown={e => e.key === 'Enter' && addGroup()}
        />
        <Button
          size="sm"
          onClick={addGroup}
          disabled={!newGroupName.trim()}
          className="h-7 px-2"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Bulk actions */}
      {groups.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={autoDistribute}
            disabled={ungroupedSessions.length === 0}
            className="h-6 px-2 text-[10px] font-mono flex-1"
          >
            Auto-distribute
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={totalAssigned === 0}
            className="h-6 px-2 text-[10px] font-mono text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Ungrouped pool */}
      {sessions.length > 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <Inbox className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Ungrouped
              </span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {ungroupedSessions.length}
            </span>
          </div>
          <div className="h-28 overflow-y-auto">
            <div className="p-1.5 space-y-1">
              {ungroupedSessions.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">
                  All samples assigned
                </p>
              ) : (
                ungroupedSessions.map(session => {
                  const idx = sessions.findIndex(s => s.id === session.id);
                  return (
                    <SampleRow
                      key={session.id}
                      name={cleanName(session.fileName)}
                      colorDot={getSampleColor(idx)}
                      groups={groups}
                      currentGroupId={null}
                      onAssign={(gid) => moveSampleTo(session.id, gid)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups list — native scroll (nested Radix ScrollArea inside another ScrollArea collapses) */}
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-2 pr-1">
          {groups.length === 0 ? (
            <div className="text-center py-6 px-3 border border-dashed border-border rounded-md">
              <Users className="w-5 h-5 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground font-mono">
                No groups yet
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Create one above to organize samples by treatment.
              </p>
            </div>
          ) : (
            groups.map(group => {
              const hasMembers = group.sessionIds.length > 0;
              const isEditing = editingGroupId === group.id;
              return (
                <div
                  key={group.id}
                  className="rounded-md border border-border bg-card overflow-hidden"
                  style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between px-2 py-1.5 bg-muted/20 border-b border-border/60">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName.trim()) renameGroup(group.id, editingName.trim());
                            setEditingGroupId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editingName.trim()) renameGroup(group.id, editingName.trim());
                              setEditingGroupId(null);
                            } else if (e.key === 'Escape') {
                              setEditingGroupId(null);
                            }
                          }}
                          className="h-5 text-xs font-mono px-1.5 py-0"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditingName(group.name);
                          }}
                          className="font-mono text-xs font-bold truncate text-left hover:underline"
                          title="Click to rename"
                        >
                          {group.name}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!hasMembers && (
                        <AlertCircle className="w-3 h-3 text-amber-500" aria-label="Empty group" />
                      )}
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground px-1">
                        {group.sessionIds.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingName(group.name);
                        }}
                        className="h-5 w-5 p-0"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                        className="h-5 w-5 p-0 hover:text-destructive"
                        title="Delete group"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Group members */}
                  <div className="p-1.5 space-y-1">
                    {group.sessionIds.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">
                        Empty — assign samples from above
                      </p>
                    ) : (
                      group.sessionIds.map(sid => {
                        const session = sessions.find(s => s.id === sid);
                        if (!session) return null;
                        const idx = sessions.findIndex(s => s.id === sid);
                        return (
                          <SampleRow
                            key={sid}
                            name={cleanName(session.fileName)}
                            colorDot={getSampleColor(idx)}
                            groups={groups}
                            currentGroupId={group.id}
                            onAssign={(gid) => moveSampleTo(sid, gid)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// SampleRow: a compact, full-width row showing sample dot + name + assign menu.
// -----------------------------------------------------------------------------
interface SampleRowProps {
  name: string;
  colorDot: string;
  groups: SampleGroup[];
  currentGroupId: string | null;
  onAssign: (groupId: string | null) => void;
}

const SampleRow: React.FC<SampleRowProps> = ({
  name,
  colorDot,
  groups,
  currentGroupId,
  onAssign,
}) => {
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-1.5 py-1 rounded',
        'hover:bg-muted/50 transition-colors',
      )}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colorDot }}
      />
      <span
        className="font-mono text-[11px] truncate flex-1 min-w-0"
        title={name}
      >
        {name}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-60 hover:opacity-100 shrink-0"
            title="Assign to group"
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Assign to group
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {groups.length === 0 && (
            <DropdownMenuItem disabled className="text-xs font-mono italic">
              No groups available
            </DropdownMenuItem>
          )}
          {groups.map(g => {
            const active = g.id === currentGroupId;
            return (
              <DropdownMenuItem
                key={g.id}
                onClick={() => onAssign(g.id)}
                className="text-xs font-mono gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                <span className="truncate flex-1">{g.name}</span>
                {active && <Check className="w-3 h-3 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
          {currentGroupId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAssign(null)}
                className="text-xs font-mono gap-2 text-muted-foreground"
              >
                <FolderInput className="w-3 h-3" />
                Move to Ungrouped
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const getGroupColor = (index: number): string => GROUP_COLORS[index % GROUP_COLORS.length];
