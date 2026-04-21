import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
  GripVertical,
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

const cleanName = (n: string) =>
  n
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*_\s*/g, ' ')
    .replace(/[\s-]+[A-Z]{2,3}$/, '')
    .replace(/\s+/g, ' ')
    .trim();

export const SampleGrouping: React.FC<SampleGroupingProps> = ({ sessions, groups, onGroupsChange }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

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

  const selectedCount = selectedSessionIds.length;
  const groupedSelectedCount = selectedSessionIds.filter(id => Boolean(getSessionGroup(id))).length;

  const selectionState = useMemo(() => {
    const ids = new Set(selectedSessionIds);
    const ungroupedSelected = ungroupedSessions.filter(session => ids.has(session.id)).length;
    const perGroup: Record<string, number> = {};
    groups.forEach(group => {
      perGroup[group.id] = group.sessionIds.filter(id => ids.has(id)).length;
    });
    return { ungroupedSelected, perGroup };
  }, [groups, selectedSessionIds, ungroupedSessions]);

  const setSelectionForSession = (sessionId: string, checked: boolean) => {
    setSelectedSessionIds(prev => {
      if (checked) return prev.includes(sessionId) ? prev : [...prev, sessionId];
      return prev.filter(id => id !== sessionId);
    });
  };

  const clearSelection = () => setSelectedSessionIds([]);

  const selectUngrouped = () => setSelectedSessionIds(ungroupedSessions.map(session => session.id));

  const assignSelectedToGroup = (targetGroupId: string) => {
    if (selectedSessionIds.length === 0) return;
    let next = groups.map(group => ({ ...group, sessionIds: group.sessionIds.filter(id => !selectedSessionIds.includes(id)) }));
    next = next.map(group =>
      group.id === targetGroupId
        ? {
            ...group,
            sessionIds: [...group.sessionIds, ...selectedSessionIds.filter(id => !group.sessionIds.includes(id))],
          }
        : group,
    );
    onGroupsChange(next);
    setSelectedSessionIds([]);
  };

  const unassignSelected = () => {
    if (groupedSelectedCount === 0) return;
    onGroupsChange(
      groups.map(group => ({
        ...group,
        sessionIds: group.sessionIds.filter(id => !selectedSessionIds.includes(id)),
      })),
    );
    setSelectedSessionIds([]);
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Treatment Groups
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80">
              Create groups, then move included samples into them. Samples left ungrouped stay in overall cross-sample analysis but are excluded from group comparisons.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {totalAssigned}/{sessions.length} assigned
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectUngrouped}
            disabled={ungroupedSessions.length === 0}
            className="h-7 px-2.5 text-[10px] font-mono"
          >
            Select ungrouped
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={selectedCount === 0}
            className="h-7 px-2.5 text-[10px] font-mono"
          >
            Clear selection
          </Button>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>
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
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background/60 p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={autoDistribute}
            disabled={ungroupedSessions.length === 0}
            className="h-7 px-2.5 text-[10px] font-mono"
          >
            Auto-distribute
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={unassignSelected}
            disabled={groupedSelectedCount === 0}
            className="h-7 px-2.5 text-[10px] font-mono"
          >
            Move selected out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={totalAssigned === 0}
            className="h-7 px-2.5 text-[10px] font-mono text-muted-foreground"
          >
            Clear groups
          </Button>
        </div>
      )}

      {/* Ungrouped pool */}
      {sessions.length > 0 && (
        <div className="rounded-md border border-border bg-muted/20">
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
          <div className="max-h-48 overflow-y-auto">
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
                      checked={selectedSessionIds.includes(session.id)}
                      name={cleanName(session.fileName)}
                      colorDot={getSampleColor(idx)}
                      groups={groups}
                      currentGroupId={null}
                      assignmentLabel="Ungrouped"
                      showDragHandle={false}
                      onToggleChecked={(checked) => setSelectionForSession(session.id, checked)}
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
      {groups.length > 0 && selectedCount > 0 && (
        <div className="rounded-md border border-border bg-background/80 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
              Move selected to
            </span>
            {groups.map(group => (
              <Button
                key={group.id}
                variant="outline"
                size="sm"
                onClick={() => assignSelectedToGroup(group.id)}
                className="h-7 gap-1.5 px-2.5 text-[10px] font-mono"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
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
                          Empty. Select samples above, then move them here.
                      </p>
                    ) : (
                      group.sessionIds.map(sid => {
                        const session = sessions.find(s => s.id === sid);
                        if (!session) return null;
                        const idx = sessions.findIndex(s => s.id === sid);
                        return (
                          <SampleRow
                            key={sid}
                              checked={selectedSessionIds.includes(sid)}
                            name={cleanName(session.fileName)}
                            colorDot={getSampleColor(idx)}
                            groups={groups}
                            currentGroupId={group.id}
                              assignmentLabel={group.name}
                              onToggleChecked={(checked) => setSelectionForSession(sid, checked)}
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
  checked: boolean;
  name: string;
  colorDot: string;
  groups: SampleGroup[];
  currentGroupId: string | null;
  assignmentLabel: string;
  showDragHandle?: boolean;
  onToggleChecked: (checked: boolean) => void;
  onAssign: (groupId: string | null) => void;
}

const SampleRow: React.FC<SampleRowProps> = ({
  checked,
  name,
  colorDot,
  groups,
  currentGroupId,
  assignmentLabel,
  showDragHandle = true,
  onToggleChecked,
  onAssign,
}) => {
  return (
    <div
      className={cn(
        'group grid grid-cols-[auto,auto,1fr,auto] items-center gap-2 rounded-md border px-2 py-2 transition-colors',
        checked ? 'border-primary/30 bg-primary/10' : 'border-transparent bg-background/50 hover:border-border hover:bg-muted/40',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onToggleChecked(value === true)}
        className="h-3.5 w-3.5"
      />
      {showDragHandle ? <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" /> : <div className="h-3.5 w-3.5" />}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colorDot }}
      />
      <div className="min-w-0">
        <span
          className="block truncate font-mono text-[11px]"
          title={name}
        >
          {name}
        </span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {assignmentLabel}
        </span>
      </div>

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
