import { useState } from 'react';
import { X } from 'lucide-react';
import { AvatarService } from '../../services/AvatarService';

interface AvatarCustomizerProps {
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

export function AvatarCustomizer({ userId, onClose, onSave }: AvatarCustomizerProps) {
  const current = AvatarService.getAvatar(userId);
  const [color, setColor] = useState(current.baseColor);

  const handleSave = () => {
    // In a real app this would save to Supabase
    AvatarService.saveAvatar(userId, { baseColor: color });
    onSave();
  };

  const colors = [
    { name: 'Blue', value: 0x3b82f6 },
    { name: 'Purple', value: 0xa855f7 },
    { name: 'Emerald', value: 0x10b981 },
    { name: 'Rose', value: 0xf43f5e },
    { name: 'Amber', value: 0xf59e0b }
  ];

  return (
    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Customize Avatar</h2>

        <div className="mb-6 flex justify-center">
          {/* Preview */}
          <div
            className="w-24 h-24 rounded-full border-4 border-zinc-800 shadow-xl"
            style={{ backgroundColor: '#' + color.toString(16).padStart(6, '0') }}
          />
        </div>

        <div className="space-y-4">
          <label className="block text-zinc-400 text-sm">Base Color</label>
          <div className="flex justify-between">
            {colors.map(c => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={`w-10 h-10 rounded-full transition-transform ${color === c.value ? 'scale-110 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: '#' + c.value.toString(16).padStart(6, '0') }}
              />
            ))}
          </div>
        </div>

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
