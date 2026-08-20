import { IsometricRoomEngine } from './IsometricRoomEngine';
import { centralPlazaRoom } from './worldManifest';

interface Props {
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
}

export function VisualPlazaPrototype(props: Props) {
  return <IsometricRoomEngine room={centralPlazaRoom} {...props}/>;
}
