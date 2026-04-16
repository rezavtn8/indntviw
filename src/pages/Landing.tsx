import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
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
import appPreview from '@/assets/app-preview.png';

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

const ACCENTS = [BRAND.navy, BRAND.teal, BRAND.coral, BRAND.ink];
const BRAND_GRADIENT = `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.teal} 50%, ${BRAND.coral} 100%)`;

const Wordmark = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero' }) => {
  const cls =
    size === 'hero'
      ? 'text-6xl md:text-8xl'
      : size === 'xl'
      ? 'text-4xl md:text-5xl'
      : size === 'lg'
      ? 'text-2xl'
      : size === 'sm'
      ? 'text-sm'
      : 'text-base';
  return (
    <span
      className={`font-sans font-bold tracking-tight ${cls} leading-none`}
      style={{ letterSpacing: '-0.03em' }}
    >
      <span style={{ color: BRAND.ink }}>Indent</span>
      <span
        style={{
          backgroundImage: BRAND_GRADIENT,
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        {/* Sticky compact nav — appears after hero scrolls out */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur transition-all duration-300 ${
            scrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-12">
            <div className="flex items-center gap-2.5">
              <BrandMark className="w-4 h-4" />
              <Wordmark size="md" />
            </div>
            <nav className="hidden md:flex items-center gap-6 font-sans text-xs text-muted-foreground">
              <a href="#capabilities" className="hover:text-foreground transition-colors">
                Capabilities
              </a>
              <a href="#methodology" className="hover:text-foreground transition-colors">
                Methodology
              </a>
              <a href="#matrix" className="hover:text-foreground transition-colors">
                Matrix
              </a>
            </nav>
            <Link to="/app">
              <Button
                size="sm"
                className="rounded-none font-sans text-xs h-8"
                style={{ backgroundColor: BRAND.navy, color: 'white' }}
              >
                Launch App <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero — oversized brand */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Faint dotted grid background */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${BRAND.ink} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          {/* Subtle gradient wash */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ background: BRAND_GRADIENT }}
          />
          {/* Top brand stripe */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: BRAND_GRADIENT }} />

          <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-20 text-center">
            {/* Eyebrow */}
            <div
              className="inline-block font-mono text-[10px] tracking-[0.25em] px-3 py-1 mb-10 border"
              style={{ color: BRAND.navy, borderColor: BRAND.navy + '40' }}
            >
              [ NANOINDENTATION · DATA PLATFORM ]
            </div>

            {/* Big BrandMark */}
            <div className="flex justify-center mb-8">
              <BrandMark className="w-20 h-20 md:w-24 md:h-24" />
            </div>

            {/* Huge wordmark */}
            <div className="flex flex-col items-center mb-10">
              <Wordmark size="hero" />
              {/* Gradient underline */}
              <div
                className="mt-5 h-[2px] w-48 md:w-64"
                style={{ background: BRAND_GRADIENT }}
              />
            </div>

            {/* Headline */}
            <h1 className="font-sans font-bold text-3xl md:text-5xl leading-[1.1] tracking-tight mb-6 max-w-3xl mx-auto" style={{ color: BRAND.ink }}>
              Quantitative analysis for{' '}
              <span className="relative inline-block">
                <span className="relative z-10">nanoindentation</span>
                <span
                  className="absolute inset-x-0 bottom-1 h-3 -z-0 opacity-30"
                  style={{ background: BRAND.coral }}
                />
              </span>{' '}
              arrays
            </h1>

            {/* Subheadline */}
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mb-10 leading-relaxed">
              IndentView is a browser-native instrument for rendering spatial property maps,
              defining regions of interest, and performing comparative statistical analysis
              across indentation datasets — all without leaving your browser.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Link to="/app">
                <Button
                  className="rounded-none font-sans px-8 h-12 text-sm border-0 transition-colors hover:opacity-90"
                  style={{ backgroundColor: BRAND.navy, color: 'white' }}
                >
                  Launch Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#capabilities">
                <Button
                  variant="outline"
                  className="rounded-none font-sans px-8 h-12 text-sm border-2"
                  style={{ borderColor: BRAND.ink, color: BRAND.ink }}
                >
                  View Capabilities
                </Button>
              </a>
            </div>

            {/* Stat strip with colored dots */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 font-mono text-xs tracking-wide">
              {stats.map((s, i) => (
                <div key={s.l} className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5"
                      style={{ background: ACCENTS[i % ACCENTS.length] }}
                    />
                    <span className="font-bold tabular-nums" style={{ color: BRAND.ink }}>
                      {s.v}
                    </span>
                    <span className="text-muted-foreground uppercase tracking-[0.15em] text-[10px]">
                      {s.l}
                    </span>
                  </div>
                  {i < stats.length - 1 && (
                    <span className="text-border hidden sm:inline">·</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* App screenshot showcase */}
        <section className="border-b border-border relative overflow-hidden">
          {/* Soft gradient backdrop */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{ background: BRAND_GRADIENT }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(${BRAND.ink} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-6 py-20">
            {/* Section eyebrow */}
            <div className="text-center mb-10">
              <div
                className="inline-block font-mono text-[10px] tracking-[0.25em] px-3 py-1 mb-4 border"
                style={{ color: BRAND.navy, borderColor: BRAND.navy + '40' }}
              >
                [ THE INTERFACE ]
              </div>
              <h2
                className="font-sans font-bold text-2xl md:text-4xl tracking-tight"
                style={{ color: BRAND.ink }}
              >
                Built for analysis, not assembly
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mt-3 text-sm md:text-base">
                A focused workspace for spatial property maps, zone definition, and
                statistical comparison — every tool one click away.
              </p>
            </div>

            {/* Framed screenshot */}
            <div className="relative">
              {/* Soft glow shadow */}
              <div
                className="absolute -inset-4 blur-2xl opacity-30 pointer-events-none"
                style={{ background: BRAND_GRADIENT }}
                aria-hidden
              />

              <div
                className="relative bg-background border-2 shadow-2xl overflow-hidden"
                style={{ borderColor: BRAND.ink }}
              >
                {/* Brand stripe */}
                <div
                  className="h-[3px] w-full"
                  style={{ background: BRAND_GRADIENT }}
                />

                {/* Window chrome */}
                <div
                  className="border-b px-4 py-2.5 flex items-center gap-2"
                  style={{ borderColor: BRAND.ink + '20', background: '#fafafa' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: BRAND.coral }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: BRAND.teal }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: BRAND.navy }}
                  />
                  <span
                    className="ml-3 text-[11px] font-mono"
                    style={{ color: BRAND.ink + 'aa' }}
                  >
                    indentview.app — CFA #3_Complex.TXT · Hardness (HIT)
                  </span>
                  <div className="ml-auto hidden sm:flex gap-3 text-[10px] font-mono text-muted-foreground">
                    <span style={{ color: BRAND.navy, fontWeight: 600 }}>2D</span>
                    <span>3D</span>
                    <span>Analysis</span>
                    <span>Export</span>
                  </div>
                </div>

                {/* Screenshot */}
                <img
                  src={appPreview}
                  alt="IndentView 2D heatmap interface showing a Viridis-colored nanoindentation point map with sidebar controls"
                  className="block w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Annotation row below screenshot */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { num: '01', label: 'Property & Color Scheme', desc: 'Switch properties (HIT, EIT…) and palettes synced across views.', color: BRAND.navy },
                { num: '02', label: 'Interactive Heatmap', desc: 'Pan, zoom, lasso-select zones and edit points in place.', color: BRAND.teal },
                { num: '03', label: 'Live Color Legend', desc: 'Right-side scale bar reflects the active range and palette.', color: BRAND.coral },
              ].map((a) => (
                <div
                  key={a.num}
                  className="border border-border bg-background/80 backdrop-blur-sm p-4 relative"
                >
                  <div
                    className="absolute top-0 left-0 w-full h-[2px]"
                    style={{ background: a.color }}
                  />
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="font-mono text-[11px] font-bold tracking-[0.15em]"
                      style={{ color: a.color }}
                    >
                      {a.num}
                    </span>
                    <span
                      className="font-sans font-semibold text-sm"
                      style={{ color: BRAND.ink }}
                    >
                      {a.label}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Status bar */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            {[
              { label: 'Publication-Ready', color: BRAND.navy },
              { label: 'ISO 14577 Compatible', color: BRAND.teal },
              { label: 'Browser-Native', color: BRAND.coral },
              { label: 'Open Data Formats', color: BRAND.ink },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5" style={{ background: item.color }} />
                <span>{item.label}</span>
                {i < arr.length - 1 && <span className="text-border ml-2">|</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="capabilities" className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3" style={{ color: BRAND.teal }}>
                [ 01 — CAPABILITIES ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                Built for the full analysis pipeline
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Every tool needed to take raw indentation arrays from import to publication-ready figure.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border">
              {features.map((f, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                return (
                  <div
                    key={f.title}
                    className="group border-r border-b border-border p-6 hover:bg-muted/40 transition-all cursor-default relative"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="font-mono text-[11px] font-bold tracking-[0.15em]" style={{ color: accent }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <f.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: BRAND.ink }} />
                    </div>
                    <h3 className="font-sans font-semibold text-sm mb-2" style={{ color: BRAND.ink }}>
                      {f.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                    <ArrowUpRight
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      strokeWidth={1.5}
                      style={{ color: accent }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Methodology pipeline */}
        <section id="methodology" className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3" style={{ color: BRAND.teal }}>
                [ 02 — METHODOLOGY ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                A deterministic processing pipeline
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Five well-defined stages from raw measurement files to exportable scientific output.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-0 items-stretch">
              {pipeline.map((p, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                return (
                  <div key={p.label} className="relative flex flex-col">
                    <div
                      className="border-2 p-5 h-full flex flex-col items-center text-center bg-background relative"
                      style={{ borderColor: BRAND.ink + '15' }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: accent }}
                      />
                      <p.icon className="h-5 w-5 mb-3" strokeWidth={1.5} style={{ color: accent }} />
                      <div className="font-mono font-semibold text-xs mb-1" style={{ color: BRAND.ink }}>
                        {String(i + 1).padStart(2, '0')} · {p.label}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.desc}</div>
                    </div>
                    {i < pipeline.length - 1 && (
                      <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 items-center">
                        <div
                          className="w-6 h-px"
                          style={{
                            backgroundImage: `linear-gradient(90deg, ${accent}, ${ACCENTS[(i + 1) % ACCENTS.length]})`,
                          }}
                        />
                        <ArrowRight
                          className="h-3 w-3 -ml-1"
                          strokeWidth={2}
                          style={{ color: ACCENTS[(i + 1) % ACCENTS.length] }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Capabilities matrix */}
        <section id="matrix" className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3" style={{ color: BRAND.teal }}>
                [ 03 — ANALYTICAL MATRIX ]
              </div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                Supported analyses &amp; outputs
              </h2>
            </div>
            <div className="border border-border overflow-x-auto">
              <table className="w-full font-sans text-xs">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-mono font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Analysis
                    </th>
                    <th className="text-left p-4 font-mono font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Methods
                    </th>
                    <th className="text-left p-4 font-mono font-semibold tracking-[0.1em] uppercase text-[10px]">
                      Output
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {capabilities.map((c, i) => {
                    const accent = ACCENTS[i % ACCENTS.length];
                    return (
                      <tr
                        key={c.type}
                        className={`border-b border-border last:border-b-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                      >
                        <td
                          className="p-4 font-semibold border-l-[3px]"
                          style={{ borderLeftColor: accent, color: BRAND.ink }}
                        >
                          {c.type}
                        </td>
                        <td className="p-4 text-muted-foreground font-mono">{c.methods}</td>
                        <td className="p-4 text-muted-foreground font-mono">{c.output}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Quote + specs */}
        <section className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="pl-6 border-l-[3px]" style={{ borderLeftColor: BRAND.coral }}>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3" style={{ color: BRAND.teal }}>
                [ 04 — DESIGN INTENT ]
              </div>
              <p className="font-sans text-xl md:text-2xl leading-snug tracking-tight" style={{ color: BRAND.ink }}>
                "A browser-native instrument for the quantitative analysis of nanoindentation arrays —
                no installations, no servers, no compromises on rigor."
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-4" style={{ color: BRAND.teal }}>
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
                    <dt className="text-muted-foreground tracking-wide text-xs font-mono uppercase">{k}</dt>
                    <dd className="text-right font-mono text-xs" style={{ color: BRAND.ink }}>{v}</dd>
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
                { icon: Upload, label: 'Upload', desc: 'Drop your indentation files', color: BRAND.navy },
                { icon: Search, label: 'Analyze', desc: 'Visualize, define zones, run statistics', color: BRAND.teal },
                { icon: FileOutput, label: 'Export', desc: 'Generate publication-ready figures', color: BRAND.coral },
              ].map((s, i) => (
                <div key={s.label} className="text-center">
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 border-2 mb-4"
                    style={{ borderColor: s.color }}
                  >
                    <s.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: s.color }} />
                  </div>
                  <div className="font-sans font-semibold text-sm mb-1" style={{ color: BRAND.ink }}>
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
            <div className="border-2 p-10 md:p-16 relative" style={{ borderColor: BRAND.ink }}>
              {/* Gradient top stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: BRAND_GRADIENT }}
              />
              <div className="absolute top-2 left-2 w-3 h-3 border-t border-l" style={{ borderColor: BRAND.navy }} />
              <div className="absolute top-2 right-2 w-3 h-3 border-t border-r" style={{ borderColor: BRAND.coral }} />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l" style={{ borderColor: BRAND.teal }} />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r" style={{ borderColor: BRAND.ink }} />
              <h2 className="font-sans font-bold text-2xl md:text-4xl tracking-tight mb-4" style={{ color: BRAND.ink }}>
                Start analyzing in under a minute
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm md:text-base">
                No installation. No account. Drop your data file and begin.
              </p>
              <Link to="/app">
                <Button
                  className="rounded-none font-sans px-10 h-12 text-sm border-0 hover:opacity-90"
                  style={{ backgroundColor: BRAND.navy, color: 'white' }}
                >
                  Launch Application <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="mt-6 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                Supports .txt · .csv · .tsv · .xlsx
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <BrandMark className="w-6 h-6" />
                <Wordmark size="lg" />
                <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Open-source nanoindentation analysis platform.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: BRAND.teal }}>
                Navigate
              </div>
              <ul className="space-y-2 font-sans text-xs">
                <li>
                  <Link to="/app" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Launch App
                  </Link>
                </li>
                <li>
                  <a href="#capabilities" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#methodology" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Methodology
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: BRAND.teal }}>
                Built With
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                React · TypeScript · D3 · Three.js · Tailwind
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground tracking-wide">
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
