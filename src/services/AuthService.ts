import { MiniKit } from '@worldcoin/minikit-js';

export const AuthService = {
  async authenticate(): Promise<{ id: string; username: string } | null> {
    if (!MiniKit.isInstalled()) {
      // Development Mock
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ id: 'dev-user-1', username: 'DevCitizen' });
        }, 500);
      });
    }

    try {
      // Real Wallet Auth (Session Verification)
      const nonce = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      // Use World ID verify command for proof-of-human
      const result = await (MiniKit.commands as any).verify({
        action: "human-world-login",
        signal: nonce,
      });

      if (result.status === "success") {
        // Exchange proof for a Supabase-compatible JWT
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const verifyRes = await fetch(`${backendUrl}/api/auth/verify`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ proof: result, nullifier_hash: crypto.randomUUID().replace(/-/g, '').substring(0, 16) }) // sending random nullifier mock
        });

        if (verifyRes.ok) {
           const { token, user } = await verifyRes.json();

           // Inject token into Supabase client to satisfy RLS
           const { supabase } = await import('../lib/supabase');
           await supabase.auth.setSession({ access_token: token, refresh_token: token });

           return user;
        }
      }
    } catch (e) {
      console.error('Auth error', e);
    }
    return null;
  }
};
