import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, FileText, Pencil, ArrowLeftRight } from 'lucide-react';
import { FileSession } from '@/types/fileSession';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface FileTabsProps {
  sessions: FileSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onReorderSessions: (fromIndex: number, toIndex: number) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
  onRenameSession,
  onReorderSessions,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const truncateFileName = (name: string, maxLength: number = 22): string => {
    if (name.length <= maxLength) return name;
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const baseName = name.slice(0, name.length - ext.length);
    const truncatedBase = baseName.slice(0, Math.max(1, maxLength - ext.length - 3));
    return `${truncatedBase}...${ext}`;
  };

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  const scrollBy = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction === 'left' ? -150 : 150,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [checkScrollability, sessions.length]);

  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current && !renamingId) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSessionId, renamingId]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIdx = renameValue.lastIndexOf('.');
      if (dotIdx > 0) {
        renameInputRef.current.setSelectionRange(0, dotIdx);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingId]);

  const startRename = (session: FileSession) => {
    setRenamingId(session.id);
    setRenameValue(session.fileName);
  };

  const commitRename = () => {
    if (renamingId) {
      const trimmed = renameValue.trim();
      const original = sessions.find(s => s.id === renamingId)?.fileName;
      if (trimmed && trimmed !== original) {
        onRenameSession(renamingId, trimmed);
      }
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (renamingId) return; // don't trigger global shortcuts while editing
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'w' && activeSessionId) {
        e.preventDefault();
        onCloseSession(activeSessionId);
      }

      if (isMod && e.key === 'Tab' && sessions.length > 1) {
        e.preventDefault();
        const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + sessions.length) % sessions.length
          : (currentIndex + 1) % sessions.length;
        onSelectSession(sessions[nextIndex].id);
      }

      // F2 to rename active tab
      if (e.key === 'F2' && activeSessionId) {
        e.preventDefault();
        const session = sessions.find(s => s.id === activeSessionId);
        if (session) startRename(session);
      }

      // Cmd/Ctrl + Shift + Arrow to move active tab
      if (isMod && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && activeSessionId) {
        const idx = sessions.findIndex(s => s.id === activeSessionId);
        if (idx === -1) return;
        const target = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (target >= 0 && target < sessions.length) {
          e.preventDefault();
          onReorderSessions(idx, target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId, sessions, onSelectSession, onCloseSession, onReorderSessions, renamingId]);

  const handleCloseAll = () => {
    sessions.forEach(session => onCloseSession(session.id));
  };

  const handleCloseOthers = () => {
    sessions.forEach(session => {
      if (session.id !== activeSessionId) {
        onCloseSession(session.id);
      }
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (renamingId) {
      e.preventDefault();
      return;
    }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onReorderSessions(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const moveSession = (sessionId: string, direction: -1 | 1) => {
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= sessions.length) return;
    onReorderSessions(idx, target);
  };

  if (sessions.length === 0) return null;

  return (
    <div className="relative flex items-center gap-1 px-2 py-1 bg-secondary/50 border-b border-border">
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy('left')}
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {canScrollLeft && (
        <div className="absolute left-8 top-0 bottom-0 w-4 bg-gradient-to-r from-secondary/50 to-transparent pointer-events-none z-10" />
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1"
      >
        {sessions.map((session, index) => {
          const isActive = session.id === activeSessionId;
          const hasChanges = session.data.points !== session.originalData.points;
          const isRenaming = renamingId === session.id;
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;
          const isFirst = index === 0;
          const isLast = index === sessions.length - 1;

          return (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger asChild>
                <div
                  ref={isActive ? activeTabRef : undefined}
                  draggable={!isRenaming}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group relative flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 font-mono text-xs cursor-pointer transition-all border rounded-sm shrink-0 select-none",
                    isActive
                      ? "bg-card border-border text-foreground shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground",
                    isDragging && "opacity-40",
                    isDragOver && "ring-2 ring-primary ring-offset-1 ring-offset-secondary/50"
                  )}
                  style={isActive ? { borderTopColor: '#3aa0a0', borderTopWidth: 2 } : undefined}
                  onClick={() => !isRenaming && onSelectSession(session.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(session);
                  }}
                  title={isRenaming ? undefined : `${session.fileName}\nDouble-click to rename · Drag to reorder`}
                >
                  {hasChanges && !isRenaming && (
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                      style={{ background: '#e8594f' }}
                      title="Unsaved changes"
                    />
                  )}
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-background border border-primary rounded px-1 py-0 font-mono text-xs outline-none min-w-[80px]"
                      style={{ width: `${Math.max(8, renameValue.length + 1)}ch` }}
                    />
                  ) : (
                    <span>{truncateFileName(session.fileName)}</span>
                  )}
                  {!isRenaming && (
                    <button
                      className="p-0.5 rounded hover:bg-destructive/20 transition-colors opacity-60 hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseSession(session.id);
                      }}
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-popover border-border font-mono text-xs">
                <ContextMenuItem onClick={() => startRename(session)}>
                  <Pencil className="w-3 h-3 mr-2" />
                  Rename
                  <span className="ml-auto text-[10px] text-muted-foreground">F2</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => moveSession(session.id, -1)} disabled={isFirst}>
                  <ChevronLeft className="w-3 h-3 mr-2" />
                  Move Left
                </ContextMenuItem>
                <ContextMenuItem onClick={() => moveSession(session.id, 1)} disabled={isLast}>
                  <ChevronRight className="w-3 h-3 mr-2" />
                  Move Right
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onReorderSessions(index, 0)}
                  disabled={isFirst}
                >
                  <ArrowLeftRight className="w-3 h-3 mr-2" />
                  Move to Start
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onReorderSessions(index, sessions.length - 1)}
                  disabled={isLast}
                >
                  <ArrowLeftRight className="w-3 h-3 mr-2" />
                  Move to End
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onCloseSession(session.id)}>
                  <X className="w-3 h-3 mr-2" />
                  Close
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCloseOthers} disabled={sessions.length <= 1}>
                  Close Others
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCloseAll} className="text-destructive">
                  Close All
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {canScrollRight && (
        <div className="absolute right-24 top-0 bottom-0 w-4 bg-gradient-to-l from-secondary/50 to-transparent pointer-events-none z-10" />
      )}

      {canScrollRight && (
        <button
          onClick={() => scrollBy('right')}
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* File count + dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <FileText className="w-3 h-3" />
            <span>{sessions.length}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
          <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground">
            Open Files ({sessions.length})
          </div>
          <DropdownMenuSeparator />
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const hasChanges = session.data.points !== session.originalData.points;
            return (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "font-mono text-xs cursor-pointer",
                  isActive && "bg-muted"
                )}
              >
                <span className="flex items-center gap-2 flex-1 truncate">
                  {hasChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <span className="truncate">{session.fileName}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCloseOthers} disabled={sessions.length <= 1}>
            Close Others
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCloseAll} className="text-destructive">
            Close All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
