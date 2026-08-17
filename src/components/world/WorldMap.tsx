import { Users, Building2, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RoomService, RoomData } from '../../services/RoomService';
import { CreateSpace } from './CreateSpace';
import { CurrentUser } from '../../App';

interface WorldMapProps {
  onEnterRoom: (roomId: string) => void;
  currentUser?: CurrentUser;
}

export function WorldMap({ onEnterRoom, currentUser }: WorldMapProps) {
  const [spaces, setSpaces] = useState<RoomData[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    const data = await RoomService.getRooms();
    if (data.length === 0) {
      setSpaces([
        { id: 'central-plaza', name: 'Central Plaza', type: 'public', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '40%', left: '50%' },
        { id: 'neon-arcade', name: 'Neon Arcade', type: 'business', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '25%', left: '30%' },
        { id: 'lunas-cafe', name: "Luna's Cafe", type: 'player', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '60%', left: '70%' },
      ]);
    } else {
      setSpaces(data);
    }
  }

  const handleRoomCreated = (roomId: string) => {
    setShowCreate(false);
    onEnterRoom(roomId);
  };

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Genesis District</h1>
          <p className="text-zinc-400 text-sm flex items-center gap-1">
            <Users size={14} />
            3,402 humans active
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
              space.type === 'public' ? 'bg-blue-500/20 text-blue-400' :
              space.type === 'business' ? 'bg-purple-500/20 text-purple-400' :
              'bg-emerald-500/20 text-emerald-400'
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

      {/* Floating Create Space Button */}
      {currentUser && (
        <button
          onClick={() => setShowCreate(true)}
          className="absolute bottom-24 right-4 bg-white text-black w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition-all z-20"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Create Space Overlay */}
      {showCreate && currentUser && (
        <CreateSpace
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onSuccess={handleRoomCreated}
        />
      )}
    </div>
  );
}
