import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { furnitureCatalog } from './furnitureCatalog';
import type { RoomDefinition } from './roomEngine';
import { serializeRoomSpaces } from './roomStudio';

export function DevCatalogInspector({ room }: { room: RoomDefinition }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'c') setOpen((current) => !current);
    };
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  if (!open) return null;
  return (
    <aside className="absolute inset-x-3 bottom-20 z-30 max-h-[60%] overflow-auto rounded-2xl border border-cyan-200/20 bg-[#071b21]/95 p-3 text-white shadow-2xl backdrop-blur-xl md:left-auto md:right-4 md:w-[420px]" aria-label="Development furniture catalogue">
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Dev only · Shift C</p><h2 className="text-sm font-black">Room object catalogue · {serializeRoomSpaces(room).length} spaces</h2></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close catalogue" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X size={16}/></button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.values(furnitureCatalog).map((item) => (
          <article key={item.id} className="rounded-xl border border-white/8 bg-white/[.04] p-2">
            <img src={item.asset} alt="" className="mx-auto h-16 w-full object-contain" />
            <p className="mt-1 truncate text-[10px] font-black text-amber-100">{item.id}</p>
            <p className="text-[9px] text-white/50">{item.editorCategory} · {item.footprint[0]}×{item.footprint[1]}</p>
            <p className="truncate text-[8px] text-white/30">{item.asset}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
