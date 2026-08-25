import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AvatarService } from '../../services/AvatarService';
import type { AvatarState } from '../../services/AvatarService';

interface AvatarCustomizerProps {
  onClose: () => void;
  onSave: () => void;
}

const COLOR_OPTIONS = [
  { name: 'Sky blue', value: 0x5c7cfa },
  { name: 'Rose pink', value: 0xef6d9b },
  { name: 'Mint green', value: 0x29c7a5 },
  { name: 'Sunset orange', value: 0xff9f43 },
  { name: 'Violet', value: 0x8b5cf6 },
  { name: 'Warm peach', value: 0xf3b48d },
  { name: 'Deep plum', value: 0x3c2850 },
  { name: 'Golden yellow', value: 0xffd166 },
];

const COLOR_GROUPS = [
  { label: 'Base', key: 'baseColor' },
  { label: 'Hair', key: 'hairColor' },
  { label: 'Clothing', key: 'outfitColor' },
  { label: 'Accessory', key: 'accessoryColor' },
] as const;

function swatch(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function AvatarCustomizer({ onClose, onSave }: AvatarCustomizerProps) {
  const [avatar, setAvatar] = useState<AvatarState>(AvatarService.getCachedAvatar());
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AvatarService.getAvatar()
      .then((appearance) => {
        if (active) setAvatar(appearance);
      })
      .catch(() => {
        if (active) setNotice('Your saved appearance could not be loaded. You can still edit this preview.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setNotice(null);
    try {
      await AvatarService.saveAvatar(avatar);
      onSave();
    } catch {
      setNotice('Your avatar could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      aria-labelledby="avatar-customizer-title"
      aria-modal="true"
      className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-zinc-950/90 p-4 backdrop-blur-md sm:items-center"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      onMouseDown={onClose}
      role="dialog"
      style={{ zIndex: 60 }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6" onMouseDown={(event) => event.stopPropagation()}>
        <button autoFocus type="button" onClick={onClose} aria-label="Close avatar customizer" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-zinc-500 hover:bg-white/5 hover:text-white">
          <X aria-hidden="true" size={20}/>
        </button>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Local demo</p>
        <h2 id="avatar-customizer-title" className="mb-5 text-xl font-bold text-white">Build your human</h2>

        <div className="mb-6 flex justify-center">
          <div aria-label="Avatar color preview" className="relative h-20 w-16 rounded-b-xl rounded-t-[30px]" role="img" style={{ background: swatch(avatar.outfitColor) }}>
            <div className="absolute -top-7 left-2 h-12 w-12 rounded-full" style={{ background: swatch(avatar.baseColor) }}/>
            <div className="absolute -top-9 left-1 h-6 w-14 rounded-t-full" style={{ background: swatch(avatar.hairColor) }}/>
            <div className="absolute -right-2 top-3 h-3 w-3 rounded-full" style={{ background: swatch(avatar.accessoryColor) }}/>
          </div>
        </div>

        <div className="space-y-4">
          {COLOR_GROUPS.map(({ label, key }) => (
            <fieldset key={key}>
              <legend className="mb-2 text-sm font-medium text-zinc-400">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const selected = avatar[key] === color.value;
                  return (
                    <button
                      type="button"
                      aria-label={`${label}: ${color.name}`}
                      aria-pressed={selected}
                      key={color.value}
                      onClick={() => setAvatar((current) => ({ ...current, [key]: color.value }))}
                      className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-transform hover:scale-110 ${selected ? 'border-white shadow-lg' : 'border-transparent'}`}
                      style={{ background: swatch(color.value) }}
                    >
                      {selected ? <Check aria-hidden="true" className="text-white drop-shadow" size={16}/> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div aria-live="polite" className="min-h-5 pt-3 text-center text-xs text-rose-300">{notice}</div>
        <button type="button" disabled={isSaving} onClick={handleSave} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-65">
          {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16}/> : null}
          {isSaving ? 'Saving…' : 'Save avatar'}
        </button>
      </div>
    </div>
  );
}
