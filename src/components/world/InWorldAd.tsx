import { Info } from 'lucide-react';

interface InWorldAdProps {
  placementId : string;
  roomName: string;
}

export function InWorldAd({   roomName }: InWorldAdProps) {
  return (
    <div className="absolute top-20 right-4 w-48 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 shadow-xl backdrop-blur-sm z-10 pointer-events-auto">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">In-World Partner</div>
        <Info size={12} className="text-zinc-600" />
      </div>
      <div className="bg-zinc-800 h-24 rounded-lg flex items-center justify-center mb-2 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20" />
         <span className="text-zinc-400 font-medium text-sm z-10 text-center px-2">YOUR BRAND HERE</span>
      </div>
      <div className="text-xs text-white font-medium mb-1">Reach verified humans in {roomName}.</div>
      <button className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
        Learn about Placements →
      </button>
    </div>
  );
}
