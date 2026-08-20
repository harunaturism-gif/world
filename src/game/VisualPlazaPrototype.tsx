import { IsometricRoomEngine } from './IsometricRoomEngine';
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
  return <IsometricRoomEngine room={centralPlazaRoom} {...props}/>;
}
