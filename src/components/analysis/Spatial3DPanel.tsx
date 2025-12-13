import React from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepthAnalysis } from './DepthAnalysis';
import { SurfaceAnalysis } from './SurfaceAnalysis';
import { SpatialDistribution } from './SpatialDistribution';
import { VolumeAnalysis } from './VolumeAnalysis';
import { GradientAnalysis } from './GradientAnalysis';
import { Layers, Waves, MapPin, Box, ArrowRight } from 'lucide-react';

interface Spatial3DPanelProps {
  points: IndentationPoint[];
  selectedProperty: string;
}

export const Spatial3DPanel: React.FC<Spatial3DPanelProps> = ({
  points,
  selectedProperty,
}) => {
  const propertyConfig = PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
  const propertyUnit = propertyConfig?.unit || '';

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available for analysis
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="depth" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-2 mt-2">
          <TabsTrigger value="depth" className="text-xs gap-1">
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Depth</span>
          </TabsTrigger>
          <TabsTrigger value="surface" className="text-xs gap-1">
            <Waves className="w-3 h-3" />
            <span className="hidden sm:inline">Surface</span>
          </TabsTrigger>
          <TabsTrigger value="spatial" className="text-xs gap-1">
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">Spatial</span>
          </TabsTrigger>
          <TabsTrigger value="volume" className="text-xs gap-1">
            <Box className="w-3 h-3" />
            <span className="hidden sm:inline">Volume</span>
          </TabsTrigger>
          <TabsTrigger value="gradient" className="text-xs gap-1">
            <ArrowRight className="w-3 h-3" />
            <span className="hidden sm:inline">Gradient</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-2 pb-2">
          <TabsContent value="depth" className="mt-2">
            <DepthAnalysis 
              points={points} 
              property={selectedProperty}
              propertyUnit={propertyUnit}
            />
          </TabsContent>

          <TabsContent value="surface" className="mt-2">
            <SurfaceAnalysis points={points} />
          </TabsContent>

          <TabsContent value="spatial" className="mt-2">
            <SpatialDistribution 
              points={points}
              property={selectedProperty}
              propertyUnit={propertyUnit}
            />
          </TabsContent>

          <TabsContent value="volume" className="mt-2">
            <VolumeAnalysis points={points} />
          </TabsContent>

          <TabsContent value="gradient" className="mt-2">
            <GradientAnalysis 
              points={points}
              property={selectedProperty}
              propertyUnit={propertyUnit}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
