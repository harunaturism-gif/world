import { useEffect, useState } from 'react';
import { IsometricRoomEngine } from './IsometricRoomEngine';
import { loadEditableRoom, ROOM_UPDATED_EVENT } from './adminRoomStore';
import { centralPlazaRoom } from './worldManifest';
import type { PlayerSpeech } from './roomEngine';

interface Props {
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  playerSpeech?: PlayerSpeech | null;
}

export function VisualPlazaPrototype(props: Props) {
  const [room, setRoom] = useState(() => loadEditableRoom(centralPlazaRoom));

  useEffect(() => {
    const refresh = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId?: string }>).detail?.roomId;
      if (!roomId || roomId === centralPlazaRoom.id) setRoom(loadEditableRoom(centralPlazaRoom));
    };
    window.addEventListener(ROOM_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(ROOM_UPDATED_EVENT, refresh);
  }, []);

  return <IsometricRoomEngine room={room} {...props}/>;
}
