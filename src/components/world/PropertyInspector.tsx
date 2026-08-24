import { Building, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LandService } from '../../services/LandService';
import type { LandPlot } from '../../services/LandService';
import type { RoomData } from '../../services/RoomService';

interface PropertyInspectorProps {
  room: RoomData;
  onClose: () => void;
}

export function PropertyInspector({ room, onClose }: PropertyInspectorProps) {
  const [plot, setPlot] = useState<LandPlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    LandService.getPlots()
      .then((plots) => {
        if (active) setPlot(plots.find((candidate) => candidate.landId === room.id) ?? null);
      })
      .catch(() => {
        if (active) setPlot(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [room.id]);

  return (
    <div
      aria-labelledby="room-details-title"
      aria-modal="true"
      className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      onMouseDown={onClose}
      role="dialog"
      style={{ zIndex: 60 }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6" onMouseDown={(event) => event.stopPropagation()}>
        <button
          autoFocus
          type="button"
          aria-label="Close room details"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X aria-hidden="true" size={20} />
        </button>

        <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-300">World directory</p>
        <h2 id="room-details-title" className="mb-5 mt-1 flex items-center gap-2 text-xl font-bold text-white">
          <Building aria-hidden="true" size={20} className="text-emerald-400" />
          Room details
        </h2>

        <dl className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium text-white">{room.name}</dd>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <dt className="text-zinc-500">Type</dt>
            <dd className="font-medium capitalize text-white">{room.type}</dd>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <dt className="text-zinc-500">Steward</dt>
            <dd className="font-medium text-blue-300">{room.owner_id ? 'Registered owner' : 'Community space'}</dd>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <dt className="text-zinc-500">Location</dt>
            <dd className="max-w-[65%] text-right font-medium text-white">{loading ? 'Loading…' : plot?.location ?? 'Not published'}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-medium text-emerald-400">{loading ? 'Loading…' : plot?.status ?? (room.is_public ? 'Public demo room' : 'Private room')}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-white py-3 font-semibold text-black hover:bg-zinc-200"
        >
          Back to room
        </button>
      </div>
    </div>
  );
}
