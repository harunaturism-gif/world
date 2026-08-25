import { Building2, ChevronRight, Compass, MapPin, RefreshCw, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '../../App';
import { ROOM_MAP_UPDATED_EVENT, RoomService } from '../../services/RoomService';
import type { RoomData } from '../../services/RoomService';

interface WorldMapProps {
  onEnterRoom: (roomId: string) => void;
  currentUser?: CurrentUser;
}

type MapStatus = 'error' | 'loading' | 'ready';

function roomAccent(type: string) {
  if (type === 'plaza') return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200';
  if (type === 'cafe') return 'border-amber-300/25 bg-amber-300/10 text-amber-200';
  if (type === 'gallery') return 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200';
  return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200';
}

function roomStatus(space: RoomData) {
  if (space.land_status === 'available') {
    return typeof space.price_hum === 'number' && space.price_hum > 0
      ? `${space.price_hum.toLocaleString()} HUM · available`
      : 'Availability details pending';
  }
  if (space.land_status === 'owned') return 'Resident space';
  if (space.land_status === 'reserved') return 'Reserved';
  return 'Public space';
}

function presenceLabel(presence: number) {
  return `${presence} ${presence === 1 ? 'human' : 'humans'} here`;
}

function RoomSummary({ compact = false, space }: { compact?: boolean; space: RoomData }) {
  const presence = space.presence ?? 0;

  return (
    <>
      <div className={`grid shrink-0 place-items-center rounded-xl border ${roomAccent(space.type)} ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <Building2 aria-hidden="true" size={compact ? 18 : 21}/>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-bold text-white">{space.name}</p>
        <p className={`mt-0.5 flex items-center gap-1 text-xs ${presence > 0 ? 'text-emerald-300' : 'text-white/35'}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${presence > 0 ? 'bg-emerald-400' : 'bg-white/25'}`}/>
          {presenceLabel(presence)}
        </p>
        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[.12em] text-white/35">{roomStatus(space)}</p>
      </div>
    </>
  );
}

function MapLoading() {
  return (
    <div aria-label="Loading world spaces" className="mx-auto mt-28 w-full max-w-md space-y-3 px-4 sm:mt-40" role="status">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
          <div className="h-12 w-12 rounded-xl bg-white/[0.07]"/>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-white/[0.08]"/>
            <div className="h-2.5 w-1/3 rounded bg-white/[0.05]"/>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorldMap({ onEnterRoom, currentUser }: WorldMapProps) {
  const [spaces, setSpaces] = useState<RoomData[]>([]);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = async (showLoading: boolean) => {
      if (showLoading) setStatus('loading');
      try {
        const data = await RoomService.getRooms();
        if (!active) return;
        setSpaces(data);
        setStatus('ready');
      } catch {
        if (!active) return;
        setStatus('error');
      }
    };

    void refresh(true);
    const handleMapUpdate = () => void refresh(false);
    window.addEventListener(ROOM_MAP_UPDATED_EVENT, handleMapUpdate);
    return () => {
      active = false;
      window.removeEventListener(ROOM_MAP_UPDATED_EVENT, handleMapUpdate);
    };
  }, [reloadToken]);

  const rankedSpaces = useMemo(
    () => [...spaces].sort((left, right) => (right.presence ?? 0) - (left.presence ?? 0)),
    [spaces],
  );
  const featuredSpace = rankedSpaces[0] ?? null;
  const totalPresence = rankedSpaces.reduce((total, space) => total + (space.presence ?? 0), 0);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07191f] text-white">
      <div aria-hidden="true" className="absolute inset-[-40%] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12)_0,rgba(9,35,42,0.2)_36%,transparent_62%)]"/>
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden opacity-70 sm:block"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        }}
      />

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 border-b border-white/[0.06] bg-[#07191f]/75 px-4 pb-4 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 pt-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200/65">Explore together</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight">Human World</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">
              <Users aria-hidden="true" size={14}/>
              {status === 'ready' ? `${totalPresence} ${totalPresence === 1 ? 'human' : 'humans'} across ${rankedSpaces.length} spaces` : 'Finding live spaces…'}
            </p>
          </div>
          {currentUser ? (
            <div className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/55 sm:block">
              Signed in as <span className="font-bold text-white/80">{currentUser.username}</span>
            </div>
          ) : null}
        </div>
      </header>

      {status === 'loading' && spaces.length === 0 ? <MapLoading/> : null}

      {status === 'error' ? (
        <div className="absolute inset-x-4 top-1/2 z-20 mx-auto max-w-sm -translate-y-1/2 rounded-3xl border border-rose-300/15 bg-[#102a31]/95 p-7 text-center shadow-2xl backdrop-blur-xl" role="alert">
          <Compass aria-hidden="true" className="mx-auto text-rose-300" size={28}/>
          <h2 className="mt-4 font-black">The world map could not load.</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/50">Check your connection and try finding the spaces again.</p>
          <button type="button" onClick={() => setReloadToken((token) => token + 1)} className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#07191f] hover:bg-cyan-50">
            <RefreshCw aria-hidden="true" size={15}/>
            Retry map
          </button>
        </div>
      ) : null}

      {status === 'ready' && rankedSpaces.length === 0 ? (
        <div className="absolute inset-x-4 top-1/2 z-20 mx-auto max-w-sm -translate-y-1/2 rounded-3xl border border-white/10 bg-[#102a31]/90 p-7 text-center shadow-2xl backdrop-blur-xl">
          <MapPin aria-hidden="true" className="mx-auto text-cyan-200" size={28}/>
          <h2 className="mt-4 font-black">No public spaces are open yet.</h2>
          <p className="mt-1 text-sm text-white/50">Come back soon—the world directory is being prepared.</p>
        </div>
      ) : null}

      {status === 'ready' && rankedSpaces.length > 0 ? (
        <>
          <section aria-label="Available world spaces" className="absolute inset-0 z-10 hidden sm:block">
            {rankedSpaces.map((space) => (
              <button
                type="button"
                key={space.id}
                aria-label={`Visit ${space.name}, ${presenceLabel(space.presence ?? 0)}`}
                onClick={() => onEnterRoom(space.id)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                style={{ left: space.left, top: space.top }}
              >
                <span aria-hidden="true" className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl transition-colors group-hover:bg-cyan-300/35"/>
                <span className="relative flex min-w-56 items-center gap-3 rounded-2xl border border-white/10 bg-[#102a31]/92 p-3 shadow-2xl backdrop-blur-xl transition duration-200 group-hover:-translate-y-1 group-hover:border-cyan-200/30 group-hover:bg-[#173b43]">
                  <RoomSummary compact space={space}/>
                  <ChevronRight aria-hidden="true" className="ml-1 shrink-0 text-white/25 transition-colors group-hover:text-cyan-100" size={17}/>
                </span>
              </button>
            ))}
          </section>

          <section aria-labelledby="mobile-spaces-title" className="absolute inset-0 z-10 overflow-y-auto px-4 pb-40 pt-32 sm:hidden">
            <div className="mx-auto max-w-md">
              <h2 id="mobile-spaces-title" className="mb-3 text-sm font-black text-white/80">Choose a live space</h2>
              <div className="space-y-3">
                {rankedSpaces.map((space, index) => (
                  <button
                    type="button"
                    key={space.id}
                    onClick={() => onEnterRoom(space.id)}
                    className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#102a31]/88 p-4 shadow-xl backdrop-blur transition-colors hover:border-cyan-200/25 hover:bg-[#173b43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    <RoomSummary space={space}/>
                    {index === 0 && (space.presence ?? 0) > 0 ? <span className="shrink-0 rounded-full bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200">Most active</span> : <ChevronRight aria-hidden="true" className="shrink-0 text-white/25" size={17}/>}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {featuredSpace ? (
            <div className="absolute bottom-20 left-1/2 z-20 hidden -translate-x-1/2 sm:block">
              <button type="button" onClick={() => onEnterRoom(featuredSpace.id)} className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-black text-[#07191f] shadow-[0_16px_50px_rgba(34,211,238,.22)] transition-transform hover:-translate-y-0.5 hover:bg-cyan-100">
                <Sparkles aria-hidden="true" size={17}/>
                Enter {featuredSpace.name}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
