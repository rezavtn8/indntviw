import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SessionProvider, VisualizationProvider, ZonesProvider, EditorProvider } from "@/contexts";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'2d' | '3d' | 'analysis' | 'export'>('2d');
  
  return (
    <SessionProvider>
      <VisualizationProvider>
        <ZonesProvider activeView={activeView}>
          <EditorProvider>
            {children}
          </EditorProvider>
        </ZonesProvider>
      </VisualizationProvider>
    </SessionProvider>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppProviders>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProviders>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
