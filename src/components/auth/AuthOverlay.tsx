import { ArrowRight, Sparkles, Users } from 'lucide-react';

interface AuthOverlayProps {
  onSuccess: (user: { id: string; username: string }) => void;
}

export function AuthOverlay({ onSuccess }: AuthOverlayProps) {
  return <div className="min-h-screen overflow-hidden bg-[#10142c] text-white relative flex items-center justify-center p-6"><div className="absolute inset-0 hw-stars" /><div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl" /><div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" /><main className="relative z-10 max-w-2xl text-center"><div className="mx-auto mb-7 h-20 w-20 rounded-[28px] border border-white/30 bg-white/10 backdrop-blur flex items-center justify-center shadow-2xl"><Sparkles className="text-amber-300" size={38}/></div><p className="text-cyan-200 font-bold tracking-[.22em] text-xs uppercase mb-4">Early access concept demo</p><h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-5">Human <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300">World</span></h1><p className="text-lg sm:text-xl text-indigo-100/85 max-w-xl mx-auto mb-9">A colorful shared place for curious humans. Wander the plaza, meet demo residents, and discover spaces together.</p><button onClick={() => onSuccess({ id: 'dev-user-1', username: 'You' })} className="mx-auto px-7 py-4 rounded-2xl bg-white text-slate-950 font-extrabold text-lg flex gap-3 items-center shadow-xl shadow-cyan-500/20 hover:scale-[1.03] active:scale-95 transition">Enter World <ArrowRight size={21}/></button><div className="mt-8 inline-flex items-center gap-2 text-sm text-indigo-200/80"><Users size={16}/> Local demo — no account or World ID required</div></main></div>;
}
