import { ArrowRight, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import { AuthService } from '../../services/AuthService';

interface AuthOverlayProps {
  onSuccess: (user: { id: string; username: string }) => void;
}

type AuthStatus = 'error' | 'idle' | 'loading';

export function AuthOverlay({ onSuccess }: AuthOverlayProps) {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const isLoading = status === 'loading';

  const handleEnterWorld = async () => {
    if (isLoading) return;
    setStatus('loading');

    try {
      const user = await AuthService.authenticate();
      if (!user) {
        setStatus('error');
        return;
      }
      onSuccess(user);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#10142c] p-6 text-white">
      <div aria-hidden="true" className="absolute inset-0 hw-stars" />
      <div aria-hidden="true" className="absolute -left-20 -top-32 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <main className="relative z-10 w-full max-w-2xl text-center">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/30 bg-white/10 shadow-2xl backdrop-blur">
          <Sparkles aria-hidden="true" className="text-amber-300" size={38}/>
        </div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-cyan-200">Early access concept demo</p>
        <h1 className="mb-5 text-5xl font-black tracking-tight sm:text-7xl">
          Human{' '}
          <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">World</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-indigo-100/85 sm:text-xl">
          A colorful shared place for curious humans. Wander the plaza, meet demo residents, and discover spaces together.
        </p>

        <button
          type="button"
          aria-describedby={status === 'error' ? 'auth-entry-error' : 'auth-entry-note'}
          aria-busy={isLoading}
          disabled={isLoading}
          onClick={handleEnterWorld}
          className="mx-auto flex min-h-14 items-center gap-3 rounded-2xl bg-white px-7 py-4 text-lg font-extrabold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:scale-[1.03] disabled:cursor-wait disabled:opacity-75 disabled:hover:scale-100 active:scale-95"
        >
          {isLoading ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" size={21}/>
              Entering World…
            </>
          ) : (
            <>
              Enter World
              <ArrowRight aria-hidden="true" size={21}/>
            </>
          )}
        </button>

        <div className="mx-auto mt-4 min-h-12 max-w-md" aria-live="polite">
          {status === 'error' ? (
            <p id="auth-entry-error" role="alert" className="rounded-xl border border-rose-300/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              We couldn’t verify your entry. Open Human World inside World App and try again.
            </p>
          ) : (
            <p id="auth-entry-note" className="inline-flex items-center gap-2 text-xs text-indigo-200/65">
              <ShieldCheck aria-hidden="true" size={15}/>
              Secure entry powered by World ID
            </p>
          )}
        </div>

        {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true' ? (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-200/80">
            <Users aria-hidden="true" size={16}/>
            Local demo active — explicit bypass
          </div>
        ) : null}
      </main>
    </div>
  );
}
