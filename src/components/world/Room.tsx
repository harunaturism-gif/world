import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Info, Coffee, GalleryVerticalEnd, Building2 } from 'lucide-react';
import { Chat } from '../social/Chat';
import { CentralPlazaEngine } from './CentralPlazaEngine';
import { RoomService, RoomData } from '../../services/RoomService';
import { PropertyInspector } from './PropertyInspector';
import { InWorldAd } from './InWorldAd';

export interface ChatMessage {
  id: number;
  author: string;
  text: string;
  isSystem: boolean;
}

interface RoomProps {
  roomId: string;
  onLeave: () => void;
  onEnterRoom: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
}

export function Room({ roomId, onLeave, onEnterRoom, onOpenProfile }: RoomProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [incomingMessage] = useState<ChatMessage | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);



  useEffect(() => {
    setRoomData(RoomService.getRoom(roomId));
  }, [roomId]);

  const handleInteract = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handlePresenceUpdate = useCallback((count: number) => {
    if (count === -1) { setIsDisconnected(true); return; }
    setIsDisconnected(false);
    setPresenceCount(count);
  }, []);

  const handleSendChat = useCallback((text: string) => { setToast(`You said: ${text}`); setTimeout(() => setToast(null), 3000); }, []);

  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 h-16 px-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-md z-20 pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-white font-semibold leading-tight capitalize flex items-center gap-2">
              {roomData?.name || roomId.replace('-', ' ')}
            </h2>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <Users size={12} />
              {presenceCount} humans present
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowInspector(true)}
          className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <Info size={20} />
        </button>
      </div>

      {/* PIXI WebGL Engine Container */}
      <div className="flex-1 relative">
        <CentralPlazaEngine
          roomType={roomData?.type}
          onInteract={handleInteract}
          onEnterRoom={onEnterRoom}
          onOpenProfile={onOpenProfile}
          onPresenceUpdate={handlePresenceUpdate}
        />

        {/* Interaction Toast Overlay */}
        {isDisconnected && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none animate-in fade-in text-sm">
            Connection Lost - Reconnecting...
          </div>
        )}

        {toast && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 text-center">
            {toast}
          </div>
        )}
      </div>

      <div className="absolute right-3 top-20 z-30 flex flex-col gap-2">
        <button aria-label="Central Plaza" onClick={() => onEnterRoom('central-plaza')} className="rounded-xl bg-[#17213d]/90 p-3 text-cyan-200 shadow-lg backdrop-blur hover:bg-[#24355e]"><Building2 size={18}/></button>
        <button aria-label="Luna's Cafe" onClick={() => onEnterRoom('lunas-cafe')} className="rounded-xl bg-[#17213d]/90 p-3 text-amber-200 shadow-lg backdrop-blur hover:bg-[#24355e]"><Coffee size={18}/></button>
        <button aria-label="Human Gallery" onClick={() => onEnterRoom('human-gallery')} className="rounded-xl bg-[#17213d]/90 p-3 text-pink-200 shadow-lg backdrop-blur hover:bg-[#24355e]"><GalleryVerticalEnd size={18}/></button>
      </div>

      {roomData && roomData.type === 'plaza' && <div className="hidden md:block"><InWorldAd placementId="central-1" roomName={roomData.name} /></div>}

      {/* Chat Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 max-h-20 overflow-hidden pointer-events-auto [&>div]:h-20">
        <Chat onSendMessage={handleSendChat} incomingMessage={incomingMessage} />
      </div>

      {showInspector && roomData && (
        <PropertyInspector
          room={roomData}
          onClose={() => setShowInspector(false)}
          onEnter={() => setShowInspector(false)}
        />
      )}
    </div>
  );
}
