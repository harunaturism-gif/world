import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RoomService } from '../../services/RoomService';
import { EventService } from '../../services/EventService';
import { BusinessService } from '../../services/BusinessService';

export function GlobalSearch({ onClose, onSelect }: { onClose: () => void, onSelect: (type: string, id: string) => void }) {
  const [query, setQuery] = useState('');

  // Mock results for MVP
  const [results, setResults] = useState<{type:string, id:string, name:string, sub:string}[]>([]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    async function doSearch() {
      const [rooms, events, businesses] = await Promise.all([
        RoomService.getRooms(),
        EventService.getEvents(),
        BusinessService.getBusinesses()
      ]);
      const q = query.toLowerCase();
      const matchedRooms = rooms.filter(r => r.name.toLowerCase().includes(q)).map(r => ({ type: 'room', id: r.id, name: r.name, sub: r.type }));
      const matchedEvents = events.filter(e => e.name.toLowerCase().includes(q)).map(e => ({ type: 'event', id: e.roomId, name: e.name, sub: e.startsAt }));
      const matchedBiz = businesses.filter(b => b.name.toLowerCase().includes(q)).map(b => ({ type: 'business', id: b.spaceId, name: b.name, sub: b.category }));
      setResults([...matchedRooms, ...matchedEvents, ...matchedBiz]);
    }
    doSearch();
  }, [query]);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 pt-safe">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search humans, spaces, events..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-zinc-700"
          />
        </div>
        <button type="button" onClick={onClose} aria-label="Close search" className="p-2 text-zinc-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-2">
        {results.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect(r.type, r.id)}
            className="w-full text-left bg-zinc-900/50 hover:bg-zinc-800 p-4 rounded-xl border border-zinc-800/50 transition-colors"
          >
            <div className="text-white font-medium">{r.name}</div>
            <div className="text-zinc-500 text-xs capitalize">{r.type} • {r.sub}</div>
          </button>
        ))}
        {query.length > 2 && results.length === 0 && (
          <div className="text-zinc-500 text-center py-8 text-sm">No results found for "{query}"</div>
        )}
      </div>
    </div>
  );
}
