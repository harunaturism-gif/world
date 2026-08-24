import { Activity, Building2, Flame, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RoomService } from '../../services/RoomService';
import type { RoomData } from '../../services/RoomService';

interface DiscoveryProps {
  onEnterRoom: (roomId: string) => void;
}

type DiscoveryStatus = 'error' | 'loading' | 'ready';

function spaceAccent(type: string) {
  if (type === 'cafe') return 'bg-blue-500/15 text-blue-300';
  if (type === 'arcade') return 'bg-purple-500/15 text-purple-300';
  if (type === 'gallery') return 'bg-pink-500/15 text-pink-300';
  return 'bg-emerald-500/15 text-emerald-300';
}

function SpaceCard({ space, onEnterRoom, trending = false }: {
  space: RoomData;
  onEnterRoom: (roomId: string) => void;
  trending?: boolean;
}) {
  const presence = space.presence ?? 0;

  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${trending ? 'bg-orange-500/15 text-orange-300' : spaceAccent(space.type)}`}>
          <Building2 size={23}/>
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{space.name}</h3>
          <p className="text-sm capitalize text-zinc-500">{space.type}</p>
          <p className={`mt-1 flex items-center gap-1 text-xs ${presence > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
            <Users aria-hidden="true" size={12}/>
            {presence} {presence === 1 ? 'human' : 'humans'}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Visit ${space.name}`}
        onClick={() => onEnterRoom(space.id)}
        className="min-h-10 shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
      >
        Visit
      </button>
    </article>
  );
}

function DiscoverySkeleton() {
  return (
    <div aria-label="Loading spaces" className="space-y-3" role="status">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-zinc-800" />
            <div className="h-2.5 w-1/4 rounded bg-zinc-800/70" />
          </div>
          <div className="h-10 w-16 rounded-xl bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function Discovery({ onEnterRoom }: DiscoveryProps) {
  const [spaces, setSpaces] = useState<RoomData[]>([]);
  const [status, setStatus] = useState<DiscoveryStatus>('loading');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    RoomService.getRooms()
      .then((data) => {
        if (!active) return;
        setSpaces([...data].sort((left, right) => (right.presence ?? 0) - (left.presence ?? 0)));
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const liveSpaces = spaces.slice(0, 3);
  const trendingSpaces = spaces.slice(3, 10);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-zinc-950 pb-16 pt-safe text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/85 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/70">Explore together</p>
          <h1 className="text-xl font-bold">Discovery</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-8 p-4">
        <section aria-labelledby="live-spaces-title">
          <h2 id="live-spaces-title" className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Activity aria-hidden="true" className="text-emerald-400" size={19}/>
            Live now
          </h2>

          {status === 'loading' ? <DiscoverySkeleton /> : null}

          {status === 'error' ? (
            <div className="rounded-2xl border border-rose-300/10 bg-rose-500/5 px-5 py-10 text-center">
              <p className="font-semibold text-zinc-200">Spaces could not load.</p>
              <p className="mt-1 text-sm text-zinc-500">Check your connection and try again.</p>
              <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                <RefreshCw aria-hidden="true" size={15}/>
                Retry
              </button>
            </div>
          ) : null}

          {status === 'ready' && liveSpaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">No public spaces are open right now.</div>
          ) : null}

          {status === 'ready' && liveSpaces.length > 0 ? (
            <div className="space-y-3">
              {liveSpaces.map((space) => <SpaceCard key={space.id} space={space} onEnterRoom={onEnterRoom}/>)}
            </div>
          ) : null}
        </section>

        {status === 'ready' ? (
          <section aria-labelledby="trending-spaces-title">
            <h2 id="trending-spaces-title" className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Flame aria-hidden="true" className="text-orange-400" size={19}/>
              Trending
            </h2>
            {trendingSpaces.length > 0 ? (
              <div className="space-y-3">
                {trendingSpaces.map((space) => <SpaceCard key={space.id} space={space} trending onEnterRoom={onEnterRoom}/>)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-8 text-center">
                <p className="text-sm font-semibold text-zinc-400">The world is still growing.</p>
                <p className="mt-1 text-xs text-zinc-600">More trending spaces will appear here as they open.</p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
