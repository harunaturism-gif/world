import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniKitProvider>
      <App />
    </MiniKitProvider>
  </StrictMode>
);
