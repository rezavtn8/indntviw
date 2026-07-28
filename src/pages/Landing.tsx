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
import { APP_VERSION_LABEL } from '@/version';
import appPreview from '@/assets/app-preview.png';

const features = [
  {
    icon: Map,
    title: '2D and 3D visualization',
    desc: 'Render heatmaps and point clouds for spatial mapping of mechanical properties across indentation grids.',
  },
  {
    icon: Layers,
    title: 'Zone-based analysis',
    desc: 'Define regions of interest with lasso or box tools, then compare statistical distributions between zones.',
  },
  {
    icon: BarChart3,
    title: 'Cross-sample comparison',
    desc: 'Group samples, run statistical tests, and assemble comparative figures across treatment conditions.',
  },
  {
    icon: FileInput,
    title: 'Multi-format import',
    desc: 'Native parsing for .txt, .csv, .tsv, and .xlsx exports from common nanoindenter platforms.',
  },
  {
    icon: Calculator,
    title: 'Statistical toolkit',
    desc: 'Descriptive statistics, normality testing, and parametric or non-parametric group comparisons.',
  },
  {
    icon: Download,
    title: 'Export studio',
    desc: 'High-resolution PNG, SVG, and PDF export with customizable layouts for journals and posters.',
  },
];

const pipeline = [
  { icon: FileType, label: 'Input', desc: '.txt / .csv / .xlsx' },
  { icon: Cpu, label: 'Parse', desc: 'Column mapping' },
  { icon: Eye, label: 'Visualize', desc: '2D / 3D maps' },
  { icon: Sigma, label: 'Analyze', desc: 'Stats and tests' },
  { icon: Share2, label: 'Export', desc: 'Figures and data' },
];

const capabilities = [
  { type: 'Descriptive', methods: 'Mean, SD, IQR, Shapiro-Wilk', output: 'Tables, JSON' },
  { type: 'Comparative', methods: "t-test, Mann-Whitney, ANOVA, Holm post-hoc", output: 'Box / violin plots with p-values' },
  { type: 'Spatial', methods: 'Heatmap, contours, 3D surface', output: 'PNG / SVG / PDF' },
  { type: 'Cross-sample', methods: 'Pooled groups, zone matching', output: 'Multi-panel figures' },
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

// Section eyebrow — clean numbered label, no brackets
const Eyebrow = ({ num, label, color = BRAND.teal }: { num?: string; label: string; color?: string }) => (
  <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.2em] uppercase">
    <span className="w-4 h-px" style={{ background: color }} />
    {num && <span className="font-bold tabular-nums" style={{ color }}>{num}</span>}
    <span style={{ color }}>{label}</span>
  </div>
);

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>IndentView · Nanoindentation visualization and analysis</title>
        <meta
          name="description"
          content="Browser-native workspace for nanoindentation data: 2D and 3D visualization, zone analysis, statistical testing, and high-resolution figure export."
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
                Workflow
              </a>
              <a href="#matrix" className="hover:text-foreground transition-colors">
                Methods
              </a>
            </nav>
            <Link to="/app">
              <Button
                size="sm"
                className="rounded-none font-sans text-xs h-8"
                style={{ backgroundColor: BRAND.navy, color: 'white' }}
              >
                Launch app <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${BRAND.ink} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: BRAND_GRADIENT }} />

          <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-20 text-center">
            {/* Big BrandMark */}
            <div className="flex justify-center mb-8">
              <BrandMark className="w-20 h-20 md:w-24 md:h-24" />
            </div>

            {/* Huge wordmark */}
            <div className="flex flex-col items-center mb-10">
              <Wordmark size="hero" />
              <div
                className="mt-5 h-[2px] w-48 md:w-64"
                style={{ background: BRAND_GRADIENT }}
              />
            </div>

            {/* Headline — single clear sentence */}
            <h1 className="font-sans font-bold text-3xl md:text-5xl leading-[1.1] tracking-tight mb-6 max-w-3xl mx-auto" style={{ color: BRAND.ink }}>
              Quantitative analysis for nanoindentation arrays.
            </h1>

            {/* Subheadline — concrete, no em-dash */}
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mb-10 leading-relaxed">
              Render spatial property maps, define regions of interest, and run comparative
              statistics on indentation datasets. Everything runs in your browser, your data
              never leaves your machine.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Link to="/app">
                <Button
                  className="rounded-none font-sans px-8 h-12 text-sm border-0 transition-colors hover:opacity-90"
                  style={{ backgroundColor: BRAND.navy, color: 'white' }}
                >
                  Launch app <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#capabilities">
                <Button
                  variant="outline"
                  className="rounded-none font-sans px-8 h-12 text-sm border-2"
                  style={{ borderColor: BRAND.ink, color: BRAND.ink }}
                >
                  See what it does
                </Button>
              </a>
            </div>

            {/* Honest factual strip — no fake numbers */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-[11px] tracking-wide text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5" style={{ background: BRAND.navy }} />
                <span>Runs in the browser</span>
              </div>
              <span className="text-border hidden sm:inline">·</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5" style={{ background: BRAND.teal }} />
                <span>No account, no upload</span>
              </div>
              <span className="text-border hidden sm:inline">·</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5" style={{ background: BRAND.coral }} />
                <span>Publication-ready output</span>
              </div>
            </div>
          </div>
        </section>

        {/* App screenshot showcase */}
        <section className="border-b border-border">
          <div className="relative max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <Eyebrow label="The interface" />
              <h2
                className="font-sans font-bold text-2xl md:text-4xl tracking-tight"
                style={{ color: BRAND.ink }}
              >
                One workspace, every step of the analysis.
              </h2>
              <p className="text-muted-foreground mt-3 text-sm md:text-base">
                A focused environment for spatial property maps, zone definition, and
                statistical comparison. No tab juggling.
              </p>
            </div>

            {/* Framed screenshot — no fake browser chrome */}
            <div className="relative">
              <div
                className="absolute -inset-4 blur-2xl opacity-20 pointer-events-none"
                style={{ background: BRAND_GRADIENT }}
                aria-hidden
              />

              <div
                className="relative bg-background border-2 shadow-2xl overflow-hidden"
                style={{ borderColor: BRAND.ink }}
              >
                <div
                  className="h-[3px] w-full"
                  style={{ background: BRAND_GRADIENT }}
                />
                <img
                  src={appPreview}
                  alt="IndentView 2D heatmap interface showing a Viridis-colored nanoindentation point map with sidebar controls"
                  className="block w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Annotation row */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { num: '01', label: 'Property and palette', desc: 'Switch between properties (HIT, EIT, …) and color schemes that stay synced across views.', color: BRAND.navy },
                { num: '02', label: 'Interactive heatmap', desc: 'Pan, zoom, lasso-select zones, and edit individual points in place.', color: BRAND.teal },
                { num: '03', label: 'Live color legend', desc: 'The right-side scale bar reflects the active range and palette in real time.', color: BRAND.coral },
              ].map((a) => (
                <div
                  key={a.num}
                  className="border border-border bg-background p-4 relative"
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

        {/* Features */}
        <section id="capabilities" className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-14 max-w-2xl">
              <Eyebrow num="01" label="Capabilities" />
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                Everything needed from raw file to finished figure.
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Six core areas cover the typical nanoindentation workflow without leaning on
                external scripts or spreadsheets.
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
              <Eyebrow num="02" label="Workflow" />
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                Five stages, one continuous flow.
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Each stage lives in the same workspace, so iteration between visualization
                and analysis stays fast.
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
              <Eyebrow num="03" label="Methods" />
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-3" style={{ color: BRAND.ink }}>
                Supported analyses and their outputs.
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

        {/* Specs (no quote — that was self-congratulatory) */}
        <section className="border-b border-border py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <Eyebrow num="04" label="Approach" />
              <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mb-4" style={{ color: BRAND.ink }}>
                Local-first, by design.
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-3">
                IndentView runs entirely in the browser. Files are parsed locally and stored
                in IndexedDB so your data stays on your machine, even when offline.
              </p>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Workspaces export as portable <span className="font-mono text-foreground">.indentview</span> archives
                you can share, archive, or move between machines.
              </p>
            </div>
            <div>
              <Eyebrow label="Technical specifications" />
              <dl className="font-sans text-sm divide-y divide-border border-y border-border">
                {[
                  ['Runtime', 'Browser (Chromium, Firefox, Safari)'],
                  ['Persistence', 'IndexedDB and localStorage'],
                  ['Backend', 'None, fully client-side'],
                  ['Input formats', '.txt, .csv, .tsv, .xlsx'],
                  ['Export', 'PNG, SVG, PDF, ZIP archive'],
                  ['Workspace file', '.indentview portable archive'],
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
                { icon: Upload, label: 'Upload', desc: 'Drop your indentation files into the workspace.', color: BRAND.navy },
                { icon: Search, label: 'Analyze', desc: 'Visualize, define zones, run statistical tests.', color: BRAND.teal },
                { icon: FileOutput, label: 'Export', desc: 'Generate publication-ready figures and tables.', color: BRAND.coral },
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
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: BRAND_GRADIENT }}
              />
              <h2 className="font-sans font-bold text-2xl md:text-4xl tracking-tight mb-4" style={{ color: BRAND.ink }}>
                Open the workspace.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm md:text-base">
                No installation, no account. Drop a data file and start.
              </p>
              <Link to="/app">
                <Button
                  className="rounded-none font-sans px-10 h-12 text-sm border-0 hover:opacity-90"
                  style={{ backgroundColor: BRAND.navy, color: 'white' }}
                >
                  Launch app <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="mt-6 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                Supports .txt, .csv, .tsv, .xlsx
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
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                A browser-native workspace for nanoindentation visualization and analysis.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: BRAND.teal }}>
                Navigate
              </div>
              <ul className="space-y-2 font-sans text-xs">
                <li>
                  <Link to="/app" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Launch app
                  </Link>
                </li>
                <li>
                  <a href="#capabilities" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#methodology" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#matrix" className="hover:underline underline-offset-4" style={{ color: BRAND.ink }}>
                    Methods
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: BRAND.teal }}>
                About
              </div>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                Built for materials scientists working with nanoindentation arrays.
                Feedback and bug reports welcome.
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground tracking-wide">
              <span>© {new Date().getFullYear()} IndentView · {APP_VERSION_LABEL}</span>
              <span>All processing happens locally in your browser.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
