import { useState, useCallback } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { Chat } from '../social/Chat';
import { CentralPlazaEngine } from './CentralPlazaEngine';

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

  const handleInteract = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handlePresenceUpdate = useCallback((count: number) => {
    setPresenceCount(count);
  }, []);

  const handleIncomingChat = useCallback((message: ChatMessage) => {
    setIncomingMessage(message);
  }, []);

  const handleSendChat = useCallback((text: string) => {
    setOutboundMessage(text);
    // Reset immediately so the same message could be sent again if needed
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
            <h2 className="text-white font-semibold leading-tight capitalize">
              {roomId.replace('-', ' ')}
            </h2>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <Users size={12} />
              {presenceCount} humans present
            </div>
          </div>
        </div>
      </div>

      {/* PIXI WebGL Engine Container */}
      <div className="flex-1 relative">
        <CentralPlazaEngine
          onInteract={handleInteract}
          onOpenProfile={onOpenProfile}
          onPresenceUpdate={handlePresenceUpdate}
          onChatMessage={handleIncomingChat}
          outboundChatMessage={outboundMessage}
        />

        {/* Interaction Toast Overlay */}
        {toast && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-30 pointer-events-none animate-in fade-in slide-in-from-top-4">
            {toast}
          </div>
        )}
      </div>

      {/* Chat Overlay - ensuring it sits above the canvas but captures pointer events correctly */}
      <div className="z-20 relative pointer-events-auto">
        <Chat onSendMessage={handleSendChat} incomingMessage={incomingMessage} />
      </div>
    </div>
  );
}
