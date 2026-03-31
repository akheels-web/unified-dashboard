import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';

interface Props {
  children?: ReactNode;
  /** If true, gives a lighter recovery UI – useful for wrapping individual page content */
  inline?: boolean;
  /** Page name shown in error message, aiding faster triage */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { inline, pageName } = this.props;
    const { error, errorInfo, showDetails } = this.state;

    // Lightweight inline error for page-level boundaries
    if (inline) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {pageName ? `${pageName} failed to load` : 'This page crashed'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            An unexpected error occurred. Try refreshing this section. If the problem persists, contact IT support.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            >
              Reload Page
            </button>
          </div>
          {/* Collapsible technical details */}
          <button
            onClick={this.toggleDetails}
            className="mt-6 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
          {showDetails && (
            <pre className="mt-3 text-left text-xs bg-muted/50 rounded-lg p-4 max-w-2xl w-full overflow-auto text-red-400 border border-red-500/20">
              {error?.toString()}
              {errorInfo?.componentStack}
            </pre>
          )}
        </div>
      );
    }

    // Full-page error (root level)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-card border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Application Error</h1>
                <p className="text-muted-foreground text-sm">The app crashed unexpectedly</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. This has been noted. You can try reloading the page, or go back to the dashboard.
            </p>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>

            {/* Collapsible details */}
            <button
              onClick={this.toggleDetails}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border pt-4"
            >
              <span>Technical details</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            {showDetails && (
              <pre className="mt-3 text-xs bg-muted/50 rounded-lg p-3 overflow-auto text-red-400 border border-red-500/20 max-h-48">
                {error?.toString()}
                {'\n\n'}
                {errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/** Convenience wrapper for wrapping individual page components to isolate crashes */
export function PageErrorBoundary({
  children,
  pageName,
}: {
  children: ReactNode;
  pageName?: string;
}) {
  return (
    <ErrorBoundary inline pageName={pageName}>
      {children}
    </ErrorBoundary>
  );
}
