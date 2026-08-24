import { Info } from 'lucide-react';

interface InWorldAdProps {
  placementId : string;
  roomName: string;
}

export function InWorldAd({ placementId, roomName }: InWorldAdProps) {
  return (
    <aside aria-label="Future partner placement" data-placement-id={placementId} className="pointer-events-auto absolute right-4 top-20 z-10 w-48 rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Partner placements</div>
        <Info aria-hidden="true" size={12} className="text-zinc-600" />
      </div>
      <div className="bg-zinc-800 h-24 rounded-lg flex items-center justify-center mb-2 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20" />
         <span className="text-zinc-400 font-medium text-sm z-10 text-center px-2">Coming later</span>
      </div>
      <p className="text-xs font-medium text-white">No paid placement is active in {roomName}.</p>
    </aside>
  );
}
