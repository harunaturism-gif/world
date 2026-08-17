import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <h1 className="text-2xl font-bold text-rose-500 mb-2">Something went wrong</h1>
          <p className="text-zinc-400 mb-6 text-sm">We hit a snag loading the world. Please try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-6 py-2 rounded-full font-medium"
          >
            Reload Human World
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
