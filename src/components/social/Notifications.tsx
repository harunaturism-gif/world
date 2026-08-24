import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NotificationService, NotificationData } from '../../services/NotificationService';

export function Notifications({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<NotificationData[]>([]);

  useEffect(() => {
    NotificationService.getNotifications().then(setNotifs);
  }, []);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 pt-safe">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-blue-500" />
          Notifications
        </h2>
        <button type="button" onClick={onClose} aria-label="Close notifications" className="p-2 text-zinc-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-2">
        {notifs.map(n => (
          <div key={n.id} className={`p-4 rounded-xl border transition-colors ${n.unread ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800/50'}`}>
            <div className="text-white text-sm mb-1">{n.text}</div>
            <div className="text-zinc-500 text-xs">{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
