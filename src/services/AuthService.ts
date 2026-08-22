import { MiniKit } from '@worldcoin/minikit-js';
import { IDKit } from '@worldcoin/idkit-core';

export const AuthService = {
  async authenticate(): Promise<any | null> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    // Explicit Development Bypass
    const isDev = import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

    // Store session internally on client temporarily for returning user continuity proof
    const storedSession = localStorage.getItem('world_session_id');

    if (!MiniKit.isInstalled() && isDev) {
      console.log("Using Development Authentication Bypass");
      await new Promise(r => setTimeout(r, 800));
      return { id: 'dev-session-id', username: 'DevCitizen' };
    }

    if (!MiniKit.isInstalled() && !isDev) {
      console.error("Not inside World App and Dev Auth disabled.");
      return null;
    }

    try {
      // Fetch RP Signature
      const rpSigRes = await fetch(`${backendUrl}/api/auth/rp-signature`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'human-world-login' })
      });
      if (!rpSigRes.ok) {
         console.error("Server missing credentials or action rejected.");
         return null;
      }
      const rpSig = await rpSigRes.json();

      let request;
      if (storedSession) {
        // Returning Login
        request = await IDKit.proveSession(`session_${storedSession.replace('session_', '')}`, {
          app_id: import.meta.env.VITE_WORLD_APP_ID || 'app_missing',
          rp_context: {
            rp_id: import.meta.env.VITE_WORLD_RP_ID || 'rp_missing',
            nonce: rpSig.nonce,
            created_at: rpSig.created_at,
            expires_at: rpSig.expires_at,
            signature: rpSig.sig,
          },
          environment: 'production'
        }).preset({ type: 'ProofOfHuman' } as any);
      } else {
        // First Login
        request = await IDKit.createSession({
          app_id: import.meta.env.VITE_WORLD_APP_ID || 'app_missing',
          rp_context: {
            rp_id: import.meta.env.VITE_WORLD_RP_ID || 'rp_missing',
            nonce: rpSig.nonce,
            created_at: rpSig.created_at,
            expires_at: rpSig.expires_at,
            signature: rpSig.sig,
          },
          environment: 'production'
        }).preset({ type: 'ProofOfHuman' } as any);
      }

      const result = await request.pollUntilCompletion();

      if (result && result.success && result.result) {
        // Send complete IDKitResult payload to backend for World validation
        const verifyRes = await fetch(`${backendUrl}/api/auth/verify`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ proof: result.result })
        });

        if (verifyRes.ok) {
           const authData = await verifyRes.json();

           if (authData.verified && authData.worldIdentity?.sessionId) {
              // Store session locally to allow returning login flow
              localStorage.setItem('world_session_id', authData.worldIdentity.sessionId);
              return authData.user;
           }
        } else {
           console.error("Backend World verification failed", await verifyRes.text());
        }
      }
    } catch (e) {
      console.error('IDKit Auth error', e);
    }
    return null;
  }
};
