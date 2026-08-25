import { useState } from 'react';
import { RoomService } from '../../services/RoomService';
import { CurrentUser } from '../../App';
import { X, Building2, HelpCircle } from 'lucide-react';

interface CreateSpaceProps {
  currentUser: CurrentUser;
  onClose: () => void;
  onSuccess: (roomId: string) => void;
}

export function CreateSpace({ currentUser, onClose, onSuccess }: CreateSpaceProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('lounge');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;
    setLoading(true);
    const room = await RoomService.createRoom(name, type);
    if (room) {
      onSuccess(room.id);
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Building2 size={20} className="text-blue-500" />
          Create Space
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-1.5">Space Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neon Arcade"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-700"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5 flex items-center justify-between">
              Template Type
              <HelpCircle size={14} className="text-zinc-600" />
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-700 appearance-none"
            >
              <option value="lounge">Lounge</option>
              <option value="cafe">Cafe</option>
              <option value="arcade">Arcade</option>
              <option value="gallery">Gallery</option>
              <option value="shop">Shop</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-white text-black py-3 rounded-xl font-medium mt-4 disabled:opacity-50 hover:bg-zinc-200 transition-colors"
          >
            {loading ? 'Creating...' : 'Initialize Space'}
          </button>
        </form>
      </div>
    </div>
  );
}
