import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Shown in the message so the user knows which part failed. */
  label?: string;
  /** Render instead of the default panel. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so one failing panel does not take down the app.
 *
 * Without this, a single undefined value anywhere in the analysis tree unmounts
 * the entire React root: the user gets a white screen and loses unsaved work
 * with no indication of what happened. That is the worst failure mode for a
 * tool people run against unfamiliar instrument exports, where malformed input
 * is normal rather than exceptional.
 *
 * Note this catches errors during rendering, lifecycle and constructors — not
 * event handlers or async callbacks, which React does not route here.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[IndentView] Error in ${this.props.label ?? 'component'}:`,
      error,
      info.componentStack,
    );
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="max-w-lg border-2 border-destructive/40 rounded-lg p-5 bg-card">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider mb-2">
            {this.props.label ? `${this.props.label} failed` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            This panel stopped rendering. The rest of the application is still
            running and your loaded data has not been altered — switch to another
            view, or reset this panel to try again.
          </p>
          <pre className="text-[11px] font-mono bg-muted/40 rounded p-2 overflow-x-auto mb-3 max-h-32">
            {error.message}
          </pre>
          <div className="flex items-center gap-2">
            <button
              onClick={this.reset}
              className="px-3 py-1.5 text-xs font-mono border border-border rounded hover:bg-muted transition-colors"
            >
              Reset panel
            </button>
            <a
              href="https://github.com/rezavtn8/indntviw/issues/new?template=bug_report.md"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-mono border border-border rounded hover:bg-muted transition-colors"
            >
              Report this
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            If it involves a specific file, attaching it to the report is the
            fastest route to a fix.
          </p>
        </div>
      </div>
    );
  }
}
