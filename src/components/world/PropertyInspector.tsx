import { X, Building } from 'lucide-react';
import { RoomData } from '../../services/RoomService';
import { useEffect, useState } from 'react';
import { LandService, LandPlot } from '../../services/LandService';

interface PropertyInspectorProps {
  room: RoomData;
  onClose: () => void;
  onEnter: (id: string) => void;
}

export function PropertyInspector({ room, onClose, onEnter }: PropertyInspectorProps) {
  const [plot, setPlot] = useState<LandPlot | null>(null);

  useEffect(() => {
    LandService.getPlots().then(plots => {
      const match = plots.find(p => p.landId === room.id);
      if (match) setPlot(match);
    });
  }, [room.id]);
  return (
    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2 uppercase">
          <Building size={20} className="text-emerald-500" />
          PLOT #{room.id.substring(0,6).toUpperCase()}
        </h2>

        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Name</span>
            <span className="text-white font-medium">{room.name}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Type</span>
            <span className="text-white font-medium capitalize">{room.type}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Owner</span>
            <span className="text-blue-400 font-medium">{room.owner_id ? `@User_${room.owner_id.substring(0,4)}` : 'Public Asset'}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Location</span>
            <span className="text-white font-medium">{plot ? plot.location : 'Unknown District'}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-zinc-500">Status</span>
            <span className="text-emerald-400 font-medium">{plot ? plot.status : 'Active'}</span>
          </div>
        </div>

        <button
          onClick={() => onEnter(room.id)}
          className="w-full bg-white text-black py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
        >
          Enter Property
        </button>
      </div>
    </div>
  );
}
