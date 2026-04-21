import React, { useEffect, useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { calculateDescriptiveStats, getPropertyValues } from '@/utils/advancedStatistics';
import { useSession } from '@/contexts/SessionContext';
import { SampleSelector, getSampleColor } from './SampleSelector';
import { SampleGrouping, SampleGroup } from './SampleGrouping';
import { CrossSampleStats } from './CrossSampleStats';
import { CrossSamplePlots } from './CrossSamplePlots';
import { CrossSampleTests } from './CrossSampleTests';
import { GroupComparison } from './GroupComparison';
import { IntraGroupAnalysis } from './IntraGroupAnalysis';
import { GroupZoneAnalysis } from './GroupZoneAnalysis';
import { ZoneBetweenGroupsAnalysis } from './ZoneBetweenGroupsAnalysis';
import { ZoneAcrossSamplesPanel } from './ZoneAcrossSamplesPanel';
import { SmartZoneAnalysis } from './SmartZoneAnalysis';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart3, GitCompare, Layers, Users, ChevronDown, MapPin, Sparkles } from 'lucide-react';

interface CrossSamplePanelProps {
  fileSessions: FileSession[];
  selectedProperty: string;
  propertyNames: string[];
  onPropertyChange: (property: string) => void;
}

export const CrossSamplePanel: React.FC<CrossSamplePanelProps> = ({
  fileSessions,
  selectedProperty,
  propertyNames,
  onPropertyChange,
}) => {
  // Get groups from context (persisted)
  const { groups, setGroups } = useSession();
  
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(() => fileSessions.map(session => session.id));
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [groupingOpen, setGroupingOpen] = useState(true);

  useEffect(() => {
    const sessionIds = fileSessions.map(session => session.id);
    setSelectedSessionIds(prev => {
      const valid = prev.filter(id => sessionIds.includes(id));
      if (valid.length === 0) return sessionIds;
      const additions = sessionIds.filter(id => !valid.includes(id));
      return additions.length > 0 ? [...valid, ...additions] : valid;
    });
  }, [fileSessions]);

  const selectedSampleSessions = useMemo(
    () => fileSessions.filter(session => selectedSessionIds.includes(session.id)),
    [fileSessions, selectedSessionIds],
  );

  const scopedGroups = useMemo(() => {
    const selectedSet = new Set(selectedSessionIds);
    return groups.map(group => ({
      ...group,
      sessionIds: group.sessionIds.filter(id => selectedSet.has(id)),
    }));
  }, [groups, selectedSessionIds]);

  const handleGroupsChange = (nextScopedGroups: SampleGroup[]) => {
    const selectedSet = new Set(selectedSessionIds);
    const previousById = new Map(groups.map(group => [group.id, group]));

    setGroups(
      nextScopedGroups.map(group => ({
        ...group,
        sessionIds: [
          ...(previousById.get(group.id)?.sessionIds.filter(id => !selectedSet.has(id)) ?? []),
          ...group.sessionIds,
        ],
      })),
    );
  };

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Prepare sample data for analysis
  const sampleData = useMemo(() => {
      return selectedSampleSessions
      .map((session, idx) => {
        // Find original index for consistent coloring
        const colorIndex = fileSessions.findIndex(s => s.id === session.id);
        const values = getPropertyValues(session.data.points, selectedProperty);
        return {
          id: session.id,
          name: session.fileName.replace(/\.[^/.]+$/, ''), // Remove extension
          colorIndex,
          values,
          stats: calculateDescriptiveStats(values),
        };
      });
  }, [fileSessions, selectedSampleSessions, selectedProperty]);

  if (fileSessions.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-mono text-sm mb-2">
            Cross-sample analysis requires multiple files
          </p>
          <p className="text-muted-foreground/70 font-mono text-xs">
            Load at least 2 data files using the "Load File" button to compare samples.
          </p>
        </div>
      </div>
    );
  }

  return (
      <div className="h-full flex min-h-0">
      {/* Left Sidebar - Sample Selection */}
      <div className="w-96 min-w-96 border-r-2 border-border bg-card flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-4 space-y-4">
          <div className="space-y-1">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider">
              Cross-Sample Analysis
            </h3>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80">
              First define which samples belong in the comparison set. Then assign only those included samples to treatment groups.
            </p>
          </div>

          <div>
            <Label className="font-mono text-xs uppercase text-muted-foreground mb-2 block">
              Property
            </Label>
            <Select value={selectedProperty} onValueChange={onPropertyChange}>
              <SelectTrigger className="font-mono text-sm w-full truncate">
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {propertyNames.map(prop => (
                  <SelectItem key={prop} value={prop} className="font-mono text-sm">
                    {getPropertyLabel(prop)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 py-4 flex flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-[1.05] overflow-hidden">
            <SampleSelector
              sessions={fileSessions}
              selectedSessionIds={selectedSessionIds}
              onSelectionChange={setSelectedSessionIds}
            />
          </div>

          <Collapsible open={groupingOpen} onOpenChange={setGroupingOpen} className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-md border border-border bg-muted/10">
            <CollapsibleTrigger className="flex items-center justify-between border-b border-border/70 px-3 py-2 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-mono text-sm font-medium">Treatment Groups</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {scopedGroups.length}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${groupingOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="min-h-0 flex-1 overflow-hidden data-[state=closed]:hidden">
              <div className="h-full p-3 overflow-hidden">
                <SampleGrouping
                  sessions={selectedSampleSessions}
                  groups={scopedGroups}
                  onGroupsChange={handleGroupsChange}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="rounded-md border border-border bg-background/60 p-3 space-y-3">
            <Label className="font-mono text-xs uppercase text-muted-foreground block">
              Plot Options
            </Label>
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs cursor-pointer">Show Violin</Label>
              <Switch checked={showViolin} onCheckedChange={setShowViolin} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs cursor-pointer">Show Points</Label>
              <Switch checked={showJitter} onCheckedChange={setShowJitter} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs cursor-pointer">B&W Mode</Label>
              <Switch checked={blackAndWhite} onCheckedChange={setBlackAndWhite} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <div className="border-b-2 border-border bg-card px-4 py-2">
            <TabsList className="bg-secondary">
              <TabsTrigger value="overview" className="font-mono text-sm gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="comparison" className="font-mono text-sm gap-2">
                <GitCompare className="w-4 h-4" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="groups" className="font-mono text-sm gap-2">
                <Users className="w-4 h-4" />
                Groups
              </TabsTrigger>
              <TabsTrigger value="zones" className="font-mono text-sm gap-2">
                <MapPin className="w-4 h-4" />
                Zones
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {sampleData.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                    <Layers className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground font-mono text-sm mb-1">
                      No samples selected
                    </p>
                    <p className="text-muted-foreground/70 font-mono text-xs">
                      Select samples from the sidebar to begin cross-sample analysis.
                    </p>
                  </div>
                </div>
              )}

              <TabsContent value="overview" className="mt-0 space-y-4">
                {sampleData.length > 0 && (
                  <>
                    <CrossSampleStats samples={sampleData} selectedProperty={selectedProperty} />
                    <CrossSamplePlots
                      samples={sampleData}
                      selectedProperty={selectedProperty}
                      showViolin={showViolin}
                      showJitter={showJitter}
                      blackAndWhite={blackAndWhite}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="comparison" className="mt-0 space-y-4">
                {sampleData.length > 0 ? (
                  <CrossSampleTests samples={sampleData} selectedProperty={selectedProperty} />
                ) : null}
              </TabsContent>

              <TabsContent value="groups" className="mt-0 space-y-4">
                {/* Intra-Group Analysis - Within Group */}
                {groups.length > 0 && (
                  <div>
                    <h4 className="font-mono text-sm font-bold uppercase mb-3">Within-Group Analysis</h4>
                     <IntraGroupAnalysis
                       fileSessions={selectedSampleSessions}
                       groups={scopedGroups}
                      selectedProperty={selectedProperty}
                    />
                  </div>
                )}

                {/* Between-Group Comparison */}
                <div className={groups.length > 0 ? "pt-4 border-t border-border" : ""}>
                  <h4 className="font-mono text-sm font-bold uppercase mb-3">Between-Group Comparison</h4>
                   <GroupComparison
                     fileSessions={selectedSampleSessions}
                     groups={scopedGroups}
                    selectedProperty={selectedProperty}
                  />
                </div>

                 {scopedGroups.filter(group => group.sessionIds.length > 0).length >= 2 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-mono text-sm font-bold uppercase mb-3">Zone Comparison Between Groups</h4>
                    <ZoneBetweenGroupsAnalysis
                       fileSessions={selectedSampleSessions}
                       groups={scopedGroups}
                      selectedProperty={selectedProperty}
                    />
                  </div>
                )}
                 {scopedGroups.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-mono text-sm font-bold uppercase mb-3">Zone Analysis within Groups</h4>
                    <GroupZoneAnalysis
                       fileSessions={selectedSampleSessions}
                       groups={scopedGroups}
                      selectedProperty={selectedProperty}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="zones" className="mt-0 space-y-4">
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-mono text-sm font-medium">Smart Zone Analysis (Auto-detect matching zones)</span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SmartZoneAnalysis
                       fileSessions={selectedSampleSessions}
                      selectedProperty={selectedProperty}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-mono text-sm font-bold uppercase mb-3">Manual Zone Selection</h4>
                  <ZoneAcrossSamplesPanel
                     fileSessions={selectedSampleSessions}
                    selectedProperty={selectedProperty}
                  />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};
