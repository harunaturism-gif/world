import { useEffect, useState } from 'react';
import { IsometricRoomEngine } from './IsometricRoomEngine';
import type { RoomEditorController } from './IsometricRoomEngine';
import { loadEditableRoom, ROOM_UPDATED_EVENT } from './adminRoomStore';
import { centralPlazaRoom } from './worldManifest';
import type { PlayerSpeech, RoomDefinition } from './roomEngine';
import { RoomService } from '../services/RoomService';
import { useDevelopmentAdmin } from '../services/AdminService';

interface Props {
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  playerSpeech?: PlayerSpeech | null;
  roomOverride?: RoomDefinition;
  editor?: RoomEditorController;
}

export function VisualPlazaPrototype(props: Props) {
  const [room, setRoom] = useState(() => loadEditableRoom(centralPlazaRoom));

  useEffect(() => {
    let active = true;
    const loadPublishedRoom = async () => {
      if (useDevelopmentAdmin) {
        if (active) setRoom(loadEditableRoom(centralPlazaRoom));
        return;
      }
      try {
        const published = await RoomService.getPublishedLayout(centralPlazaRoom.id);
        if (active) setRoom(published?.layout ?? centralPlazaRoom);
      } catch {
        if (active) setRoom(centralPlazaRoom);
      }
    };
    const refresh = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId?: string }>).detail?.roomId;
      if (!roomId || roomId === centralPlazaRoom.id) void loadPublishedRoom();
    };
    void loadPublishedRoom();
    window.addEventListener(ROOM_UPDATED_EVENT, refresh);
    return () => { active = false; window.removeEventListener(ROOM_UPDATED_EVENT, refresh); };
  }, []);

  return <IsometricRoomEngine room={props.roomOverride ?? room} {...props}/>;
}
