import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import App from './App';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import './index.css';

const useDevAuth = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
const app = useDevAuth ? <App /> : <MiniKitProvider><App /></MiniKitProvider>;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fullscreen
      title="Human World could not start"
      message="Your session is safe. Try again, or reload the app to reconnect."
    >
      {app}
    </ErrorBoundary>
  </StrictMode>,
);
