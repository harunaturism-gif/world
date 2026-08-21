import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Info, Coffee, GalleryVerticalEnd, Building2 } from 'lucide-react';
import { Chat } from '../social/Chat';
import { CentralPlazaEngine } from './CentralPlazaEngine';
import { RoomService, RoomData } from '../../services/RoomService';
import { PropertyInspector } from './PropertyInspector';
import { InWorldAd } from './InWorldAd';
import type { PlayerSpeech } from '../../game/roomEngine';

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
  const [playerSpeech, setPlayerSpeech] = useState<PlayerSpeech | null>(null);



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

  const handleSendChat = useCallback((text: string) => { setPlayerSpeech({ id: Date.now(), text }); setToast(`You said: ${text}`); setTimeout(() => setToast(null), 3000); }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#10252d]">
      {/* Header Overlay */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-white/[0.06] bg-gradient-to-b from-[#07191f]/96 via-[#0b2026]/82 to-[#0b1b21]/38 px-3 shadow-[0_10px_32px_rgba(3,15,18,.16)] backdrop-blur-xl sm:px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="-ml-1 rounded-full p-2 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black capitalize leading-tight text-amber-50">
              {roomData?.name || roomId.replace('-', ' ')}
            </h2>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-300">
              <Users size={12} />
              {presenceCount} humans present <span className="ml-1 text-amber-200/70">· live plaza</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowInspector(true)}
          className="rounded-full p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
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
          playerSpeech={playerSpeech}
        />

        {/* Interaction Toast Overlay */}
        {isDisconnected && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-50 -translate-x-1/2 animate-in rounded-full bg-rose-600 px-4 py-2 text-sm text-white shadow-lg fade-in">
            Connection Lost - Reconnecting...
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-30 max-w-[86%] -translate-x-1/2 animate-in rounded-2xl border border-emerald-100/15 bg-[#0c2930]/96 px-4 py-2 text-center text-sm font-semibold text-amber-50 shadow-xl backdrop-blur-xl fade-in slide-in-from-top-4">
            {toast}
          </div>
        )}
      </div>

      <div className="absolute right-2 top-16 z-30 flex flex-col gap-1.5 sm:right-3">
        <button aria-label="Central Plaza" onClick={() => onEnterRoom('central-plaza')} className="rounded-xl border border-white/10 bg-[#102a31]/82 p-2.5 text-cyan-100 shadow-lg backdrop-blur transition-colors hover:bg-[#28515a]"><Building2 size={17}/></button>
        <button aria-label="Luna's Cafe" onClick={() => onEnterRoom('lunas-cafe')} className="rounded-xl border border-white/10 bg-[#102a31]/82 p-2.5 text-amber-200 shadow-lg backdrop-blur transition-colors hover:bg-[#28515a]"><Coffee size={17}/></button>
        <button aria-label="Human Gallery" onClick={() => onEnterRoom('human-gallery')} className="rounded-xl border border-white/10 bg-[#102a31]/82 p-2.5 text-pink-200 shadow-lg backdrop-blur transition-colors hover:bg-[#28515a]"><GalleryVerticalEnd size={17}/></button>
      </div>

      {roomData && roomData.type === 'plaza' && <div className="hidden opacity-55 2xl:block"><InWorldAd placementId="central-1" roomName={roomData.name} /></div>}

      {/* Chat Overlay */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 h-20 overflow-visible [&>div]:h-20">
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
