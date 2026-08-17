interface AvatarProps {
  isMe?: boolean;
}

export function Avatar({ isMe }: AvatarProps) {
  return (
    <div className="relative">
      {/* Base Avatar Shadow/Highlight */}
      <div className={`w-8 h-12 rounded-t-full rounded-b-md ${
        isMe ? 'bg-blue-500' : 'bg-zinc-600'
      } border-2 border-zinc-900 shadow-xl relative overflow-hidden`}
      >
        {/* Simple visor/face indicator */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-2 bg-zinc-900 rounded-full opacity-50" />
      </div>

      {/* Floor Shadow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/50 blur-[2px] rounded-full -z-10" />
    </div>
  );
}
