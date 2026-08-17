import { ShieldCheck } from 'lucide-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useState } from 'react';

interface AuthOverlayProps {
  onSuccess: (user: { id: string; username: string }) => void;
}

export function AuthOverlay({ onSuccess }: AuthOverlayProps) {
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    if (!MiniKit.isInstalled()) {
      // Dev mock auth
      setTimeout(() => {
        onSuccess({ id: 'dev-user-1', username: 'DevCitizen' });
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const result = await MiniKit.walletAuth({
        nonce: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        statement: 'Sign in to Human World',
        expirationTime: new Date(Date.now() + 1000 * 60 * 60)
      });

      if (result.executedWith !== 'fallback' && result.data?.address) {
        // Mock successful verify callback for demo purposes
        // Real app would verify SIWE on backend
        onSuccess({ id: result.data.address, username: `Human_${result.data.address.substring(2, 6)}` });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center z-50 fixed inset-0">
      <ShieldCheck className="w-16 h-16 text-blue-500 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">Human World</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">
        A persistent social economy. Verification required to ensure one human, one identity.
      </p>
      <button
        onClick={handleAuth}
        disabled={loading}
        className="bg-white text-black px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify with World ID'}
      </button>
    </div>
  );
}
