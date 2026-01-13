import React from 'react';
import { Upload } from 'lucide-react';

interface AppLayoutProps {
  header: React.ReactNode;
  fileTabs: React.ReactNode;
  sidebar: React.ReactNode;
  toolbar?: React.ReactNode;
  modeTabs?: React.ReactNode;
  contextPanel?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDraggingOverPage?: boolean;
  modals?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  header,
  fileTabs,
  sidebar,
  toolbar,
  modeTabs,
  contextPanel,
  children,
  footer,
  isDraggingOverPage,
  modals,
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Page-level drop overlay */}
      {isDraggingOverPage && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary rounded-lg bg-card/50">
            <Upload className="w-12 h-12 text-primary animate-bounce" />
            <span className="font-mono text-lg font-bold text-primary">Drop files to upload</span>
            <span className="font-mono text-xs text-muted-foreground">.txt, .csv, .tsv, .xlsx, .xls</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        {header}
      </header>

      {/* File Tabs */}
      {fileTabs}

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {sidebar}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mode Tabs (e.g., Figure/Batch export toggle) */}
          {modeTabs}

          {/* Toolbar */}
          {toolbar}

          {/* Main Content */}
          <main className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 p-2">
              {children}
            </div>
            
            {/* Context Panel */}
            {contextPanel}
          </main>
        </div>
      </div>

      {/* Footer / Status Bar */}
      {footer && (
        <footer className="border-t border-border bg-card">
          {footer}
        </footer>
      )}

      {/* Modals */}
      {modals}
    </div>
  );
};
