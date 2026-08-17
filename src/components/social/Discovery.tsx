import { Users, Building2, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RoomService, RoomData } from '../../services/RoomService';

interface DiscoveryProps {
  onEnterRoom: (roomId: string) => void;
}

export function Discovery({ onEnterRoom }: DiscoveryProps) {
  const [spaces, setSpaces] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      setLoading(true);
      const data = await RoomService.getRooms();
      if (data.length === 0) {
        setSpaces([
          { id: 'central-plaza', name: 'Central Plaza', type: 'public', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '40%', left: '50%' },
          { id: 'neon-arcade', name: 'Neon Arcade', type: 'arcade', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '25%', left: '30%' },
          { id: 'lunas-cafe', name: "Luna's Cafe", type: 'cafe', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '60%', left: '70%' },
        ]);
      } else {
        setSpaces(data);
      }
      setLoading(false);
    }
    loadRooms();
  }, []);

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-y-auto pt-safe pb-16">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-10 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Discovery</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-8">

        {/* Live Now Section */}
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="text-emerald-500" size={20} />
            LIVE NOW
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-zinc-500">Loading spaces...</div>
            ) : spaces.slice(0, 3).map((space) => (
              <div key={space.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    space.type === 'cafe' ? 'bg-blue-500/20 text-blue-400' :
                    space.type === 'arcade' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{space.name}</h3>
                    <div className="text-zinc-500 text-sm capitalize">{space.type}</div>
                    <div className="text-emerald-400 text-xs flex items-center gap-1 mt-1">
                      <Users size={12} />
                      {space.presence || 1} humans
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onEnterRoom(space.id)}
                  className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
                >
                  Visit
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Section */}
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            🔥 TRENDING
          </h2>
          <div className="space-y-3">
            {!loading && spaces.slice(3, 10).map((space) => (
              <div key={space.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-500/20 text-orange-400`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{space.name}</h3>
                    <div className="text-zinc-500 text-sm capitalize">{space.type}</div>
                  </div>
                </div>
                <button
                  onClick={() => onEnterRoom(space.id)}
                  className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
                >
                  Visit
                </button>
              </div>
            ))}
            {!loading && spaces.length <= 3 && (
               <div className="text-zinc-500 text-sm">No other trending spaces right now.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
