import { MiniKit } from '@worldcoin/minikit-js';
import { IDKit, CredentialRequest, any } from '@worldcoin/idkit-core';

function isValidWorldRpId(value: unknown): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.startsWith('rp_')
    && value.length > 3;
}

function isSanitizedUser(value: unknown): value is { id: string; username: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string'
    && /^user_[0-9a-f]{64}$/.test(user.id)
    && typeof user.username === 'string'
    && /^Human_[0-9A-F]{8}$/.test(user.username);
}

export const AuthService = {
  async authenticate(): Promise<any | null> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    // Explicit Development Bypass.
    // Important: do not probe MiniKit in this branch so normal browser development
    // does not emit "MiniKit is not installed" warnings.
    const isDev = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

    if (isDev) {
      console.log('Using Development Authentication Bypass');
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { id: 'dev-session-id', username: 'DevCitizen' };
    }

    try {
      const sessionRes = await fetch(`${backendUrl}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (isSanitizedUser(sessionData.user)) return sessionData.user;
      }

      if (!MiniKit.isInstalled()) {
        console.error('Not inside World App and Dev Auth disabled.');
        return null;
      }

      // Session proofs require an actionless RP-context signature from the backend.
      const rpSigRes = await fetch(`${backendUrl}/api/auth/session-rp-context`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!rpSigRes.ok) {
        console.error('Server could not create a session RP context.');
        return null;
      }

      const rpSig = await rpSigRes.json();
      if (!isValidWorldRpId(rpSig.rp_id)) {
        console.error('Backend provided an invalid World RP ID.');
        return null;
      }

      const app_id = import.meta.env.VITE_WORLD_APP_ID;

      if (!app_id) {
        console.error('Missing VITE_WORLD_APP_ID environment configuration');
        return null;
      }

      const request = await IDKit.createSession({
        app_id,
        rp_context: {
          rp_id: rpSig.rp_id,
          nonce: rpSig.nonce,
          created_at: rpSig.created_at,
          expires_at: rpSig.expires_at,
          signature: rpSig.sig,
        },
        environment: 'production',
      }).constraints(any(CredentialRequest('proof_of_human')));

      const result = await request.pollUntilCompletion();

      if (result && result.success && result.result) {
        const verifyRes = await fetch(`${backendUrl}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proof: result.result }),
          credentials: 'include',
        });

        if (verifyRes.ok) {
          const authData = await verifyRes.json();

          if (authData.verified && isSanitizedUser(authData.user)) return authData.user;
        } else {
          console.error('Backend World verification failed.');
        }
      }
    } catch {
      console.error('IDKit authentication failed.');
    }

    return null;
  },
};
