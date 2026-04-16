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
  ArrowUpRight,
  FileType,
  Cpu,
  Eye,
  Sigma,
  Share2,
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
    desc: 'Define regions of interest with lasso/box tools and compare statistical distributions between zones.',
  },
  {
    icon: BarChart3,
    title: 'Cross-Sample Comparison',
    desc: 'Group samples, run statistical tests, and generate publication-ready comparative figures.',
  },
  {
    icon: FileInput,
    title: 'Multi-Format Import',
    desc: 'Native support for .txt, .csv, .tsv, and .xlsx exports from major nanoindenter platforms.',
  },
  {
    icon: Calculator,
    title: 'Statistical Toolkit',
    desc: 'Descriptive statistics, normality tests, parametric and non-parametric group comparisons.',
  },
  {
    icon: Download,
    title: 'Export Studio',
    desc: 'High-resolution PNG / SVG / PDF export with customizable layouts for journals and posters.',
  },
];

const pipeline = [
  { icon: FileType, label: 'Data Input', desc: '.txt / .csv / .xlsx' },
  { icon: Cpu, label: 'Parse', desc: 'Column mapping' },
  { icon: Eye, label: 'Visualize', desc: '2D / 3D maps' },
  { icon: Sigma, label: 'Analyze', desc: 'Stats & tests' },
  { icon: Share2, label: 'Export', desc: 'Figures & data' },
];

const capabilities = [
  { type: 'Descriptive', methods: 'Mean, SD, IQR, Shapiro-Wilk', output: 'Tables, JSON' },
  { type: 'Comparative', methods: "t-test, Mann-Whitney, ANOVA, Tukey", output: 'Box / Violin + p-values' },
  { type: 'Spatial', methods: 'Heatmap, contours, 3D surface', output: 'PNG / SVG / PDF' },
  { type: 'Cross-sample', methods: 'Pooled groups, zone matching', output: 'Multi-panel figures' },
];

const stats = [
  { v: '2D + 3D', l: 'Visualization' },
  { v: '6+', l: 'Statistical Tests' },
  { v: '4', l: 'Export Formats' },
  { v: '0', l: 'Server Uploads' },
];

// Brand palette derived from the wordmark gradient (navy → teal → coral)
const BRAND = {
  navy: '#2a4d8f',
  teal: '#3aa0a0',
  coral: '#e8594f',
  ink: '#0f1a2b',
};

const Wordmark = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const cls =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span
      className={`font-sans font-bold tracking-tight ${cls} leading-none`}
      style={{ letterSpacing: '-0.02em' }}
    >
      <span style={{ color: BRAND.ink }}>Indent</span>
      <span
        style={{
          backgroundImage: `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.teal} 50%, ${BRAND.coral} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        view
      </span>
    </span>
  );
};

const BrandMark = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <div
    className={`${className} grid grid-cols-2 grid-rows-2 gap-px p-px border`}
    style={{ borderColor: BRAND.ink }}
  >
    <div style={{ background: BRAND.navy }} />
    <div style={{ background: BRAND.teal }} />
    <div style={{ background: BRAND.ink }} />
    <div style={{ background: BRAND.coral }} />
  </div>
);

const Landing = () => {
  // Generate heatmap cells with a deterministic monochrome gradient
  const cells = Array.from({ length: 144 }).map((_, i) => {
    const x = i % 12;
    const y = Math.floor(i / 12);
    const v =
      0.5 +
      0.4 * Math.sin(x * 0.55 + y * 0.3) * Math.cos(y * 0.4 - x * 0.2);
    const lightness = 95 - v * 75;
    return { x, y, lightness: Math.max(8, Math.min(95, lightness)) };
  });

  return (
    <>
      <Helmet>
        <title>IndentView — Nanoindentation Data Visualization & Analysis</title>
        <meta
          name="description"
          content="Browser-native platform for nanoindentation data: 2D/3D visualization, zone analysis, statistical testing, and publication-ready exports."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border border-foreground grid grid-cols-2 grid-rows-2 gap-px p-px">
                <div className="bg-foreground" />
                <div className="bg-foreground/30" />
                <div className="bg-foreground/60" />
                <div className="bg-foreground" />
              </div>
              <span className="font-sans font-bold text-base tracking-tight">IndentView</span>
              <span className="hidden sm:inline text-[10px] font-sans text-muted-foreground border border-border px-1.5 py-0.5">
                v1.0
              </span>
            </div>
            <Link to="/app">
              <Button variant="outline" size="sm" className="rounded-none font-sans text-xs">
                Launch App <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
            <div className="inline-block font-sans text-[10px] tracking-[0.2em] text-muted-foreground border border-border px-3 py-1 mb-8">
              [ NANOINDENTATION · DATA PLATFORM ]
            </div>
            <h1 className="font-sans font-bold text-4xl md:text-6xl leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
              Interactive Visualization &amp; Statistical Analysis of{' '}
              <span className="relative inline-block">
                <span className="relative z-10">Nanoindentation</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-foreground/10 -z-0" />
              </span>{' '}
              Data
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mb-10 leading-relaxed">
              A browser-native instrument for rendering spatial property maps, defining regions of
              interest, and performing comparative statistical analysis across indentation datasets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Link to="/app">
                <Button className="rounded-none font-sans px-8 h-12 text-sm">
                  Launch Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#capabilities">
                <Button variant="outline" className="rounded-none font-sans px-8 h-12 text-sm">
                  View Capabilities
                </Button>
              </a>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto border border-border">
              {stats.map((s, i) => (
                <div
                  key={s.l}
                  className={`p-4 ${i < stats.length - 1 ? 'md:border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} ${i === 0 ? 'border-r' : ''} ${i === 2 ? 'border-r md:border-r' : ''} border-border`}
                >
                  <div className="font-sans font-bold text-lg tracking-tight">{s.v}</div>
                  <div className="font-sans text-[10px] tracking-[0.15em] text-muted-foreground uppercase mt-1">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live visual mockup */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="border border-border bg-background">
              {/* Window chrome */}
              <div className="border-b border-border px-4 py-2 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border border-border" />
                <div className="w-2.5 h-2.5 rounded-full border border-border" />
                <div className="w-2.5 h-2.5 rounded-full border border-border" />
                <span className="ml-3 text-[10px] font-sans text-muted-foreground">
                  IndentView — sample_001.txt · EIT (GPa)
                </span>
                <div className="ml-auto flex gap-3 text-[10px] font-sans text-muted-foreground">
                  <span>2D</span>
                  <span className="text-foreground border-b border-foreground">3D</span>
                  <span>Analysis</span>
                  <span>Export</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-0 min-h-[340px]">
                {/* Heatmap */}
                <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-border p-4 relative overflow-hidden">
                  <div className="text-[10px] font-sans text-muted-foreground mb-2 flex justify-between">
                    <span>Hardness Map · 12×12</span>
                    <span>μm</span>
                  </div>
                  <div className="relative aspect-square max-h-[280px] mx-auto">
                    <svg viewBox="0 0 240 240" className="w-full h-full">
                      {cells.map((c, i) => (
                        <rect
                          key={i}
                          x={c.x * 20}
                          y={c.y * 20}
                          width={19}
                          height={19}
                          fill={`hsl(0 0% ${c.lightness}%)`}
                        />
                      ))}
                      {/* Scanning line */}
                      <line
                        x1="0"
                        x2="240"
                        y1="0"
                        y2="0"
                        stroke="hsl(var(--foreground))"
                        strokeWidth="0.5"
                        opacity="0.6"
                      >
                        <animate
                          attributeName="y1"
                          values="0;240;0"
                          dur="6s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="y2"
                          values="0;240;0"
                          dur="6s"
                          repeatCount="indefinite"
                        />
                      </line>
                    </svg>
                    {/* Axis labels */}
                    <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] font-sans text-muted-foreground">
                      <span>0</span>
                      <span>250</span>
                      <span>500</span>
                    </div>
                    <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-[9px] font-sans text-muted-foreground">
                      <span>500</span>
                      <span>0</span>
                    </div>
                  </div>
                </div>

                {/* Box plot */}
                <div className="md:col-span-2 p-4">
                  <div className="text-[10px] font-sans text-muted-foreground mb-2">
                    Distribution · GPa
                  </div>
                  <svg viewBox="0 0 200 260" className="w-full h-[260px]">
                    {/* Y axis */}
                    <line x1="30" x2="30" y1="10" y2="230" stroke="hsl(var(--border))" />
                    <line x1="30" x2="195" y1="230" y2="230" stroke="hsl(var(--border))" />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <g key={i}>
                        <line
                          x1="27"
                          x2="30"
                          y1={10 + i * 55}
                          y2={10 + i * 55}
                          stroke="hsl(var(--border))"
                        />
                        <text
                          x="24"
                          y={13 + i * 55}
                          textAnchor="end"
                          fontSize="8"
                          fontFamily="monospace"
                          fill="hsl(var(--muted-foreground))"
                        >
                          {(8 - i * 1.5).toFixed(1)}
                        </text>
                      </g>
                    ))}

                    {/* Box plot 1 */}
                    {[
                      { cx: 75, top: 60, q1: 95, med: 120, q3: 145, bot: 185 },
                      { cx: 145, top: 40, q1: 80, med: 100, q3: 130, bot: 170 },
                    ].map((b, i) => (
                      <g key={i}>
                        <line
                          x1={b.cx}
                          x2={b.cx}
                          y1={b.top}
                          y2={b.bot}
                          stroke="hsl(var(--foreground))"
                        />
                        <line
                          x1={b.cx - 10}
                          x2={b.cx + 10}
                          y1={b.top}
                          y2={b.top}
                          stroke="hsl(var(--foreground))"
                        />
                        <line
                          x1={b.cx - 10}
                          x2={b.cx + 10}
                          y1={b.bot}
                          y2={b.bot}
                          stroke="hsl(var(--foreground))"
                        />
                        <rect
                          x={b.cx - 22}
                          y={b.q1}
                          width="44"
                          height={b.q3 - b.q1}
                          fill={i === 0 ? 'hsl(var(--foreground) / 0.08)' : 'hsl(var(--foreground) / 0.18)'}
                          stroke="hsl(var(--foreground))"
                        />
                        <line
                          x1={b.cx - 22}
                          x2={b.cx + 22}
                          y1={b.med}
                          y2={b.med}
                          stroke="hsl(var(--foreground))"
                          strokeWidth="1.5"
                        />
                        {[b.top - 8, b.bot + 6, b.bot + 12].map((cy, k) => (
                          <circle
                            key={k}
                            cx={b.cx + (k % 2 === 0 ? -3 : 3)}
                            cy={cy}
                            r="1.5"
                            fill="hsl(var(--foreground))"
                          />
                        ))}
                        <text
                          x={b.cx}
                          y="248"
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="monospace"
                          fill="hsl(var(--muted-foreground))"
                        >
                          Zone {i + 1}
                        </text>
                      </g>
                    ))}

                    {/* Significance bracket */}
                    <line x1="75" x2="145" y1="25" y2="25" stroke="hsl(var(--foreground))" />
                    <line x1="75" x2="75" y1="25" y2="32" stroke="hsl(var(--foreground))" />
                    <line x1="145" x2="145" y1="25" y2="32" stroke="hsl(var(--foreground))" />
                    <text
                      x="110"
                      y="20"
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="monospace"
                      fill="hsl(var(--foreground))"
                    >
                      ***
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status bar */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-sans text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            <span>Publication-Ready</span>
            <span className="text-border">|</span>
            <span>ISO 14577 Compatible</span>
            <span className="text-border">|</span>
            <span>Browser-Native</span>
            <span className="text-border">|</span>
            <span>Open Data Formats</span>
          </div>
        </section>

        {/* Features */}
        <section id="capabilities" className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3">
                [ 01 — CAPABILITIES ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3">
                Built for the full analysis pipeline
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Every tool needed to take raw indentation arrays from import to publication-ready figure.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="group border-r border-b border-border p-6 hover:bg-muted/40 transition-colors cursor-default relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="font-sans text-[10px] tracking-[0.15em] text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <f.icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-sans font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                  <ArrowUpRight
                    className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={1.5}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Methodology pipeline */}
        <section className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3">
                [ 02 — METHODOLOGY ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3">
                A deterministic processing pipeline
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Five well-defined stages from raw measurement files to exportable scientific output.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-0 items-stretch">
              {pipeline.map((p, i) => (
                <div key={p.label} className="relative flex flex-col">
                  <div className="border border-border p-5 h-full flex flex-col items-center text-center">
                    <p.icon className="h-5 w-5 mb-3" strokeWidth={1.5} />
                    <div className="font-sans font-semibold text-xs mb-1">
                      {String(i + 1).padStart(2, '0')} · {p.label}
                    </div>
                    <div className="font-sans text-[10px] text-muted-foreground">{p.desc}</div>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 items-center">
                      <div className="w-6 border-t border-dashed border-border" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground -ml-1" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities matrix */}
        <section className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3">
                [ 03 — ANALYTICAL MATRIX ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3">
                Supported analyses &amp; outputs
              </h2>
            </div>
            <div className="border border-border overflow-x-auto">
              <table className="w-full font-sans text-xs">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Analysis
                    </th>
                    <th className="text-left p-4 font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Methods
                    </th>
                    <th className="text-left p-4 font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Output
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {capabilities.map((c, i) => (
                    <tr
                      key={c.type}
                      className={`border-b border-border last:border-b-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="p-4 font-semibold">{c.type}</td>
                      <td className="p-4 text-muted-foreground">{c.methods}</td>
                      <td className="p-4 text-muted-foreground">{c.output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Quote + specs */}
        <section className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="border-l-2 border-foreground pl-6">
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3">
                [ 04 — DESIGN INTENT ]
              </div>
              <p className="font-sans text-xl md:text-2xl leading-snug tracking-tight">
                "A browser-native instrument for the quantitative analysis of nanoindentation arrays —
                no installations, no servers, no compromises on rigor."
              </p>
            </div>
            <div>
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-4">
                TECHNICAL SPECIFICATIONS
              </div>
              <dl className="font-sans text-sm divide-y divide-border border-y border-border">
                {[
                  ['Runtime', 'Browser (Chromium / Firefox / Safari)'],
                  ['Persistence', 'IndexedDB · localStorage'],
                  ['Backend', 'None — fully client-side'],
                  ['Data formats', '.txt · .csv · .tsv · .xlsx'],
                  ['Export', 'PNG · SVG · PDF · ZIP archive'],
                  ['Project files', '.indentview portable archive'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-3">
                    <dt className="text-muted-foreground tracking-wide text-xs">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Workflow simple */}
        <section className="border-b border-border py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Upload, label: 'Upload', desc: 'Drop your indentation files' },
                { icon: Search, label: 'Analyze', desc: 'Visualize, define zones, run statistics' },
                { icon: FileOutput, label: 'Export', desc: 'Generate publication-ready figures' },
              ].map((s, i) => (
                <div key={s.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 border border-border mb-4">
                    <s.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="font-sans font-semibold text-sm mb-1">
                    {i + 1}. {s.label}
                  </div>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-20 text-center">
            <div className="border border-border p-10 md:p-16 relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-foreground" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-foreground" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-foreground" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-foreground" />
              <h2 className="font-sans font-bold text-2xl md:text-4xl tracking-tight mb-4">
                Start analyzing in under a minute
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm md:text-base">
                No installation. No account. Drop your data file and begin.
              </p>
              <Link to="/app">
                <Button className="rounded-none font-sans px-10 h-12 text-sm">
                  Launch Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="mt-6 font-sans text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                Supports .txt · .csv · .tsv · .xlsx
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 border border-foreground grid grid-cols-2 grid-rows-2 gap-px p-px">
                  <div className="bg-foreground" />
                  <div className="bg-foreground/30" />
                  <div className="bg-foreground/60" />
                  <div className="bg-foreground" />
                </div>
                <span className="font-sans font-bold text-sm">IndentView</span>
                <span className="text-[10px] font-sans text-muted-foreground border border-border px-1.5">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Open-source nanoindentation analysis platform.
              </p>
            </div>
            <div>
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3 uppercase">
                Navigate
              </div>
              <ul className="space-y-2 font-sans text-xs">
                <li>
                  <Link to="/app" className="hover:underline underline-offset-4">
                    Launch App
                  </Link>
                </li>
                <li>
                  <a href="#capabilities" className="hover:underline underline-offset-4">
                    Capabilities
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground mb-3 uppercase">
                Built With
              </div>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                React · TypeScript · D3 · Three.js · Tailwind
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 font-sans text-[10px] text-muted-foreground tracking-wide">
              <span>© {new Date().getFullYear()} IndentView · MIT License</span>
              <span>build · {Math.random().toString(16).slice(2, 10)}</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
