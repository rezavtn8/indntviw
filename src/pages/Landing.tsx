import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Map,
  Layers,
  BarChart3,
  FileInput,
  Calculator,
  Download,
  Upload,
  Search,
  FileOutput,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Map,
    title: '2D & 3D Visualization',
    desc: 'Heatmaps and point clouds for spatial mapping of mechanical properties across indentation grids.',
  },
  {
    icon: Layers,
    title: 'Zone-Based Analysis',
    desc: 'Define regions of interest and compare statistical distributions between user-defined zones.',
  },
  {
    icon: BarChart3,
    title: 'Cross-Sample Comparison',
    desc: 'Group samples, run statistical tests, and generate publication-ready comparative figures.',
  },
  {
    icon: FileInput,
    title: 'Multi-Format Import',
    desc: 'Support for .txt, .csv, .tsv, and .xlsx files from major nanoindenter platforms.',
  },
  {
    icon: Calculator,
    title: 'Statistical Toolkit',
    desc: 'Descriptive statistics, box/violin plots, correlation analysis, and group comparisons.',
  },
  {
    icon: Download,
    title: 'Export Studio',
    desc: 'High-resolution figure export with customizable layouts for journals and posters.',
  },
];

const steps = [
  { icon: Upload, label: 'Upload', desc: 'Import your indentation data files' },
  { icon: Search, label: 'Analyze', desc: 'Visualize, define zones, run statistics' },
  { icon: FileOutput, label: 'Export', desc: 'Generate publication-ready figures' },
];

const Landing = () => {
  return (
    <>
      <Helmet>
        <title>IndentView — Nanoindentation Data Visualization & Analysis</title>
        <meta
          name="description"
          content="Interactive visualization and statistical analysis platform for nanoindentation data. 2D heatmaps, 3D point clouds, zone comparison, and publication-ready exports."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
            <span className="font-mono font-bold text-lg tracking-tight">IndentView</span>
            <Link to="/app">
              <Button variant="outline" size="sm" className="rounded-none font-mono text-xs">
                Launch App <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <h1 className="font-mono font-bold text-3xl md:text-5xl leading-tight tracking-tight mb-6">
            Interactive Visualization &amp; Statistical Analysis of Nanoindentation Data
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mb-10">
            A browser-based platform for rendering spatial property maps, defining regions of
            interest, and performing comparative statistical analysis across indentation datasets.
          </p>
          <Link to="/app">
            <Button className="rounded-none font-mono px-8 h-12 text-sm">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </section>

        {/* App Mockup */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="border border-border rounded-none bg-muted/30 overflow-hidden">
            <div className="border-b border-border px-4 py-2 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="ml-3 text-[10px] font-mono text-muted-foreground">IndentView — workspace</span>
            </div>
            <div className="grid grid-cols-5 gap-0 h-56 md:h-72">
              {/* Fake heatmap */}
              <div className="col-span-3 border-r border-border p-4 flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-px">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const lightness = 20 + Math.abs(Math.sin(i * 0.4)) * 60;
                    return (
                      <div
                        key={i}
                        className="rounded-none"
                        style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)` }}
                      />
                    );
                  })}
                </div>
              </div>
              {/* Fake box plot */}
              <div className="col-span-2 p-4 flex flex-col items-center justify-center gap-3">
                {[0.6, 0.45, 0.7].map((h, i) => (
                  <div key={i} className="flex items-end gap-1 h-full w-full max-w-[80px]">
                    <div className="flex-1 bg-foreground/20 border border-border" style={{ height: `${h * 100}%` }} />
                    <div className="flex-1 bg-foreground/10 border border-border" style={{ height: `${(h - 0.1) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="font-mono font-bold text-xl md:text-2xl text-center mb-14 tracking-tight">
              Capabilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f) => (
                <div key={f.title} className="border border-border p-6">
                  <f.icon className="h-5 w-5 mb-4 text-foreground" strokeWidth={1.5} />
                  <h3 className="font-mono font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t border-border py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="font-mono font-bold text-xl md:text-2xl text-center mb-14 tracking-tight">
              Workflow
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <div key={s.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 border border-border mb-4">
                    <s.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="font-mono font-semibold text-sm mb-1">
                    {i + 1}. {s.label}
                  </div>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs font-mono">
              IndentView — Open-source nanoindentation analysis platform
            </span>
            <Link to="/app" className="text-xs font-mono text-foreground underline underline-offset-4 hover:text-muted-foreground">
              Launch App →
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
