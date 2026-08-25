import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Home, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fullscreen?: boolean;
  message?: string;
  onExit?: () => void;
  onReset?: () => void;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Uncaught error:', error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private exit = () => {
    this.setState({ hasError: false, error: null });
    this.props.onExit?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className={`${this.props.fullscreen ? 'fixed' : 'absolute'} inset-0 z-50 grid place-items-center overflow-y-auto bg-[#081b21] p-6 text-center text-white`} role="alert">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0e2931] p-7 shadow-2xl shadow-black/30">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rose-200/15 bg-rose-300/10 text-rose-200">
              <RefreshCw aria-hidden="true" size={23}/>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-rose-200/70">Safe recovery</p>
            <h1 className="mt-1 text-2xl font-black text-amber-50">{this.props.title ?? 'This part of the world paused'}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">
              {this.props.message ?? 'Your account is safe. Try opening this area again or reload Human World.'}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={this.reset}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-4 text-sm font-black text-[#092027] transition hover:bg-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                <RotateCcw aria-hidden="true" size={17}/>
                Try again
              </button>
              {this.props.onExit ? (
                <button
                  type="button"
                  onClick={this.exit}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm font-bold text-white/75 transition hover:bg-white/[.09] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                >
                  <Home aria-hidden="true" size={17}/>
                  Return to World
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="min-h-12 rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm font-bold text-white/75 transition hover:bg-white/[.09] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                >
                  Reload app
                </button>
              )}
            </div>
            {this.props.onExit ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 min-h-10 px-3 text-xs font-bold text-white/45 underline decoration-white/20 underline-offset-4 transition hover:text-white/75 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
              >
                Reload Human World
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
