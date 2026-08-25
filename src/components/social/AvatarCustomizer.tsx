import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AvatarService, AvatarState } from '../../services/AvatarService';

interface AvatarCustomizerProps {
  onClose: () => void;
  onSave: () => void;
}

export function AvatarCustomizer({ onClose, onSave }: AvatarCustomizerProps) {
  const [avatar, setAvatar] = useState<AvatarState>(AvatarService.getCachedAvatar());

  useEffect(() => {
    void AvatarService.getAvatar().then(setAvatar);
  }, []);

  const handleSave = async () => {
    await AvatarService.saveAvatar(avatar);
    onSave();
  };

  const colors = [0x5c7cfa, 0xef6d9b, 0x29c7a5, 0xff9f43, 0x8b5cf6];
  const swatch = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
  const set = (patch: Partial<AvatarState>) => setAvatar({ ...avatar, ...patch });

  return (
    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X size={20} />
        </button>
        <p className="text-cyan-300 text-xs font-bold tracking-widest uppercase">Local demo</p>
        <h2 className="text-xl font-bold text-white mb-6">Build your human</h2>

        <div className="mb-6 flex justify-center">
          {/* Preview */}
          <div className="relative h-20 w-16 rounded-t-[30px] rounded-b-xl" style={{ background: swatch(avatar.outfitColor) }}><div className="absolute -top-7 left-2 h-12 w-12 rounded-full" style={{ background: swatch(avatar.baseColor) }}/><div className="absolute -top-9 left-1 h-6 w-14 rounded-t-full" style={{ background: swatch(avatar.hairColor) }}/><div className="absolute top-3 -right-2 h-3 w-3 rounded-full" style={{ background: swatch(avatar.accessoryColor) }}/></div>
        </div>

        {([['Base', 'baseColor'], ['Hair', 'hairColor'], ['Clothing', 'outfitColor'], ['Accessory', 'accessoryColor']] as const).map(([label, key]) => <div key={key} className="mb-4"><p className="text-sm text-zinc-400 mb-2">{label}</p><div className="flex gap-2">{colors.map(color => <button aria-label={`${label} color`} key={color} onClick={() => set({ [key]: color })} className="h-8 w-8 rounded-full" style={{ background: swatch(color), outline: avatar[key] === color ? '2px solid white' : undefined }}/>)}</div></div>)}

        <button
          onClick={handleSave}
          className="w-full bg-white text-black py-3 rounded-xl font-medium mt-8 hover:bg-zinc-200 transition-colors"
        >
          Save Avatar
        </button>
      </div>
    </div>
  );
}
