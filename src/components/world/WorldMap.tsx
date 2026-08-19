import { Users, Building2, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RoomService, RoomData } from '../../services/RoomService';
import { CurrentUser } from '../../App';

interface WorldMapProps {
  onEnterRoom: (roomId: string) => void;
  currentUser?: CurrentUser;
}

export function WorldMap({ onEnterRoom, currentUser }: WorldMapProps) {
  const [spaces, setSpaces] = useState<RoomData[]>([]);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    const data = await RoomService.getRooms();
    setSpaces(data);
  }

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-hidden">
      {/* Abstract Map Background */}
      <div className="absolute inset-[-50%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_50%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
      }} />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Human World</h1>
          <p className="text-zinc-400 text-sm flex items-center gap-1">
            <Users size={14} />
            Local demo district
          </p>
        </div>
      </div>

      {/* Map Nodes */}
      {spaces.map((space) => (
        <button
          key={space.id}
          onClick={() => onEnterRoom(space.id)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
          style={{ top: space.top, left: space.left }}
        >
          {/* Node Glow */}
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-400/40 transition-colors" />

          {/* Node UI */}
          <div className="relative bg-zinc-900/90 border border-zinc-800 backdrop-blur-sm p-3 rounded-2xl shadow-xl flex items-center gap-3 group-hover:border-blue-500/50 transition-colors">
            <div className={`p-2 rounded-xl ${
              space.type === 'plaza' ? 'bg-blue-500/20 text-blue-400' : space.type === 'cafe' ? 'bg-amber-500/20 text-amber-300' : 'bg-fuchsia-500/20 text-fuchsia-300'
            }`}>
              <Building2 size={20} />
            </div>
            <div className="text-left whitespace-nowrap">
              <div className="text-white font-medium text-sm">{space.name}</div>
              <div className="text-zinc-500 text-xs flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {space.presence || 1} online
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors ml-2" />
          </div>
        </button>
      ))}

      {currentUser && <button onClick={() => onEnterRoom('central-plaza')} className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-cyan-300 text-slate-950 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"><Sparkles size={18}/> Enter Central Plaza</button>}
    </div>
  );
}
