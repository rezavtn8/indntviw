import React from 'react';
import { Grid2X2, Box, Layers, BarChart3, FileOutput } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ViewType = '2d' | '3d' | 'overlay' | 'analysis' | 'export';

interface ViewSidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  children?: React.ReactNode;
}

const viewItems: { id: ViewType; icon: React.ElementType; label: string }[] = [
  { id: '2d', icon: Grid2X2, label: '2D Heatmap' },
  { id: '3d', icon: Box, label: '3D View' },
  { id: 'overlay', icon: Layers, label: 'Overlay' },
  { id: 'analysis', icon: BarChart3, label: 'Analysis' },
  { id: 'export', icon: FileOutput, label: 'Export Studio' },
];

export const ViewSidebar: React.FC<ViewSidebarProps> = ({
  activeView,
  onViewChange,
  children,
}) => {
  return (
    <aside className="flex h-full border-r border-border bg-card">
      {/* View Navigation Icons */}
      <div className="w-14 border-r border-border flex flex-col items-center py-2 gap-1 bg-muted/30">
        {viewItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onViewChange(item.id)}
                  // These buttons carry only an icon, so without an accessible
                  // name a screen reader announces them as "button" and they
                  // cannot be targeted by name in automated tests.
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'relative w-10 h-10 flex items-center justify-center rounded transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  style={isActive ? { color: '#2a4d8f' } : undefined}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
                      style={{
                        background:
                          'linear-gradient(180deg, #2a4d8f 0%, #3aa0a0 50%, #e8594f 100%)',
                      }}
                    />
                  )}
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-mono text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Controls Panel */}
      {children && (
        <div className="w-64 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      )}
    </aside>
  );
};
