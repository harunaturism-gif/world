import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import App from './App';
import './index.css';

const app = <App />;
const useDevAuth = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useDevAuth ? app : <MiniKitProvider>{app}</MiniKitProvider>}
  </StrictMode>,
);
