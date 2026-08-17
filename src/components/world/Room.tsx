import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Info } from 'lucide-react';
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
  onOpenProfile?: (username: string) => void;
}

export function Room({ roomId, onLeave, onOpenProfile }: RoomProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null);
  const [outboundMessage, setOutboundMessage] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);



  useEffect(() => {
    // Basic mock fetch for the current room data to pass to the Inspector
    const fetchRoom = async () => {
      const rooms = await RoomService.getRooms();
      const match = rooms.find(r => r.id === roomId);
      if (match) {
        setRoomData(match);
      } else {
        // Fallback for hardcoded rooms if they aren't in Supabase/Mock yet
        setRoomData({
          id: roomId,
          name: roomId.replace('-', ' '),
          owner_id: null,
          type: 'public',
          capacity: 50,
          is_public: true,
          created_at: new Date().toISOString(),
          top: '0%', left: '0%'
        });
      }
    };
    fetchRoom();
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

  const handleIncomingChat = useCallback((message: ChatMessage) => {
    setIncomingMessage(message);
  }, []);

  const handleSendChat = useCallback((text: string) => {
    setOutboundMessage(text);
    setTimeout(() => setOutboundMessage(null), 50);
  }, []);

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
          roomId={roomId}
          roomType={roomData?.type}
          onInteract={handleInteract}
          onOpenProfile={onOpenProfile}
          onPresenceUpdate={handlePresenceUpdate}
          onChatMessage={handleIncomingChat}
          outboundChatMessage={outboundMessage}
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

      {roomData && roomData.type === 'public' && <InWorldAd placementId="central-1" roomName={roomData.name} />}

      {/* Chat Overlay */}
      <div className="z-20 relative pointer-events-auto">
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
