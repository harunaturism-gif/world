import { Building2, CalendarDays, Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BusinessService } from '../../services/BusinessService';
import { EventService } from '../../services/EventService';
import { RoomService } from '../../services/RoomService';

export type SearchResultType = 'business' | 'event' | 'human' | 'room';

type SearchResult = {
  type: Exclude<SearchResultType, 'human'>;
  id: string;
  name: string;
  detail: string;
};

type SearchStatus = 'error' | 'idle' | 'loading' | 'ready';

type GlobalSearchProps = {
  onClose: () => void;
  onSelect: (type: SearchResultType, id: string) => void;
};

const RESULT_ICONS = {
  business: <Building2 size={18}/>,
  event: <CalendarDays size={18}/>,
  room: <MapPin size={18}/>,
};

const RESULT_LABELS = {
  business: 'Business',
  event: 'Event',
  room: 'Space',
};

export function GlobalSearch({ onClose, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (normalizedQuery.length < 2) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const [rooms, events, businesses] = await Promise.all([
          RoomService.getRooms(),
          EventService.getEvents(),
          BusinessService.getBusinesses(),
        ]);

        if (cancelled) return;

        const includesQuery = (...values: string[]) => values.some((value) => value.toLowerCase().includes(normalizedQuery));
        const matchedRooms: SearchResult[] = rooms
          .filter((room) => includesQuery(room.name, room.type))
          .map((room) => ({ type: 'room', id: room.id, name: room.name, detail: room.type }));
        const matchedEvents: SearchResult[] = events
          .filter((event) => includesQuery(event.name, event.startsAt))
          .map((event) => ({ type: 'event', id: event.roomId, name: event.name, detail: event.startsAt }));
        const matchedBusinesses: SearchResult[] = businesses
          .filter((business) => includesQuery(business.name, business.category))
          .map((business) => ({ type: 'business', id: business.spaceId, name: business.name, detail: business.category }));

        setResults([...matchedRooms, ...matchedEvents, ...matchedBusinesses]);
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setResults([]);
        setStatus('error');
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setResults([]);
    setStatus('loading');
  };

  return (
    <div
      aria-labelledby="global-search-title"
      aria-modal="true"
      className="absolute inset-0 z-50 bg-zinc-950/95 p-4 pt-safe text-white backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      role="dialog"
    >
      <h2 id="global-search-title" className="sr-only">Search Human World</h2>
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            aria-label="Search spaces, events, and businesses"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search spaces, events, businesses..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-white focus:border-cyan-400/45 focus:outline-none"
          />
        </div>
        <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div aria-live="polite" className="mx-auto max-w-2xl">
        {status === 'idle' ? (
          <div className="grid place-items-center py-16 text-center text-zinc-500">
            <Search aria-hidden="true" size={28} className="mb-3 text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-400">Discover somewhere new</p>
            <p className="mt-1 text-xs">Type at least two characters to begin.</p>
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400" role="status">
            <Loader2 aria-hidden="true" className="animate-spin text-cyan-300" size={18}/>
            Searching Human World…
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-rose-200">Search is unavailable right now.</p>
            <p className="mt-1 text-xs text-zinc-500">Close this panel and try again.</p>
          </div>
        ) : null}

        {status === 'ready' && results.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">No results found for “{query.trim()}”.</div>
        ) : null}

        {status === 'ready' && results.length > 0 ? (
          <div aria-label="Search results" className="space-y-2">
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-500">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            {results.map((result) => (
              <button
                type="button"
                key={`${result.type}:${result.id}`}
                onClick={() => onSelect(result.type, result.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/55 p-4 text-left transition-colors hover:border-cyan-400/20 hover:bg-zinc-800"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  {RESULT_ICONS[result.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{result.name}</span>
                  <span className="mt-0.5 block truncate text-xs capitalize text-zinc-500">
                    {RESULT_LABELS[result.type]} · {result.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
