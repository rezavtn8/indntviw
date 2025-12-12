import React from 'react';
import { X } from 'lucide-react';
import { FileSession } from '@/types/fileSession';
import { cn } from '@/lib/utils';

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
  if (sessions.length === 0) return null;

  const truncateFileName = (name: string, maxLength: number = 20): string => {
    if (name.length <= maxLength) return name;
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const baseName = name.slice(0, name.length - ext.length);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 3);
    return `${truncatedBase}...${ext}`;
  };

  return (
    <div className="relative flex items-center gap-1 px-2 py-1 bg-secondary/50 border-b border-border">
      {/* Scroll indicator shadows */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-secondary/50 to-transparent pointer-events-none z-10 opacity-0 has-[+div:hover]:opacity-100" />
      
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const hasChanges = session.data.points !== session.originalData.points;
          
          return (
            <div
              key={session.id}
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
          );
        })}
      </div>
    </div>
  );
};
