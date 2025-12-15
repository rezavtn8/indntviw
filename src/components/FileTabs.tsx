import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, FileText } from 'lucide-react';
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
}

export const FileTabs: React.FC<FileTabsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const truncateFileName = (name: string, maxLength: number = 20): string => {
    if (name.length <= maxLength) return name;
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const baseName = name.slice(0, name.length - ext.length);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 3);
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
    
    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Check scrollability on mount and when sessions change
  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [checkScrollability, sessions.length]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      
      // Cmd/Ctrl + W to close current tab
      if (isMod && e.key === 'w' && activeSessionId) {
        e.preventDefault();
        onCloseSession(activeSessionId);
      }
      
      // Cmd/Ctrl + Tab to cycle tabs (forward)
      // Cmd/Ctrl + Shift + Tab to cycle tabs (backward)
      if (isMod && e.key === 'Tab' && sessions.length > 1) {
        e.preventDefault();
        const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + sessions.length) % sessions.length
          : (currentIndex + 1) % sessions.length;
        onSelectSession(sessions[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId, sessions, onSelectSession, onCloseSession]);

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

      {/* Left fade gradient */}
      {canScrollLeft && (
        <div className="absolute left-8 top-0 bottom-0 w-4 bg-gradient-to-r from-secondary/50 to-transparent pointer-events-none z-10" />
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1"
      >
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const hasChanges = session.data.points !== session.originalData.points;

          return (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger asChild>
                <div
                  ref={isActive ? activeTabRef : undefined}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-1.5 font-mono text-xs cursor-pointer transition-colors border rounded-sm shrink-0",
                    isActive
                      ? "bg-card border-border text-foreground shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground"
                  )}
                  onClick={() => onSelectSession(session.id)}
                  title={session.fileName}
                >
                  <span className="flex items-center gap-1.5">
                    {hasChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Unsaved changes" />
                    )}
                    {truncateFileName(session.fileName)}
                  </span>
                  <button
                    className="p-0.5 rounded hover:bg-destructive/20 transition-colors opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseSession(session.id);
                    }}
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-popover border-border">
                <ContextMenuItem onClick={() => onCloseSession(session.id)}>
                  Close
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCloseOthers} disabled={sessions.length <= 1}>
                  Close Others
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCloseAll}>
                  Close All
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Right fade gradient */}
      {canScrollRight && (
        <div className="absolute right-24 top-0 bottom-0 w-4 bg-gradient-to-l from-secondary/50 to-transparent pointer-events-none z-10" />
      )}

      {/* Right scroll button */}
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
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
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
