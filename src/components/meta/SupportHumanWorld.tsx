import { Heart, Handshake, Landmark, ChevronRight } from 'lucide-react';

export function SupportHumanWorld() {
  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-y-auto pt-safe pb-16">
      <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-10 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Support & Meta</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* Support Project */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Heart size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Support the Project</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Human World began as an independent idea to build a persistent digital world designed around real human interaction. Support goes towards development, infrastructure, security, and community research.
          </p>
          <button className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors">
            Become a Founding Supporter
          </button>
        </section>

        {/* Partnerships */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Handshake size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Partnerships</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Brands, creators, and communities can partner with Human World to build persistent spaces, host events, and engage with verified humans.
          </p>
          <button className="w-full bg-zinc-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
            Submit Partnership Interest <ChevronRight size={16} />
          </button>
        </section>

        {/* Investment */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Landmark size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Investment Interest</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Interested in investing? Investment opportunities are subject to legal structure, eligibility, and applicable regulation. This form does not constitute an offer.
          </p>
          <button className="w-full border border-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2">
            Contact Us <ChevronRight size={16} />
          </button>
        </section>

      </div>
    </div>
  );
}
