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
        const id = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
        return {
          id: id,
          username: `Human_${id.substring(0, 4).toUpperCase()}`
        };
      }
    } catch (e) {
      console.error('Auth error', e);
    }
    return null;
  }
};
