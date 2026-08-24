import { useEffect, useMemo, useState } from 'react';
import { Box, Building2, Clipboard, MapPinned, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import {
  addCatalogObject,
  deleteRoomObject,
  exportEditableRoom,
  resetEditableRoom,
  saveEditableRoom,
  updateCatalogObject,
} from '../../game/adminRoomStore';
import { furnitureCatalog, type FurnitureId } from '../../game/furnitureCatalog';
import { centralPlazaRoom } from '../../game/worldManifest';
import { RoomService, type LandStatus, type RoomData } from '../../services/RoomService';

type Tab = 'maps' | 'objects';

interface Props {
  onClose: () => void;
  onEnterRoom: (roomId: string) => void;
  room: typeof centralPlazaRoom;
  selectedObjectId: string | null;
  onRoomChange: (room: typeof centralPlazaRoom) => void;
  onSelectedObjectIdChange: (objectId: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const fieldClass = 'w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-300/60';
const buttonClass = 'rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10';

export function AdminControlPanel({ onClose, onEnterRoom, room, selectedObjectId, onRoomChange, onSelectedObjectIdChange, onDirtyChange }: Props) {
  const [tab, setTab] = useState<Tab>('objects');
  const [maps, setMaps] = useState<RoomData[]>(() => RoomService.getAdminRooms());
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [newPosition, setNewPosition] = useState({ x: 4, y: 4 });
  const [savedRoomJson, setSavedRoomJson] = useState(() => exportEditableRoom(room));
  const [message, setMessage] = useState('Local admin draft. Backend publishing comes later.');
  const hasUnsavedChanges = exportEditableRoom(room) !== savedRoomJson;

  useEffect(() => {
    onDirtyChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const selectedObject = room.objects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedCatalog = selectedObject?.catalogId && selectedObject.catalogId in furnitureCatalog
    ? furnitureCatalog[selectedObject.catalogId as FurnitureId]
    : null;

  const catalogItems = useMemo(() => Object.entries(furnitureCatalog)
    .filter(([, item]) => catalogCategory === 'all' || item.editorCategory === catalogCategory), [catalogCategory]);

  const categories = useMemo(() => Array.from(new Set(Object.values(furnitureCatalog).map((item) => item.editorCategory))), []);

  const patchMap = (id: string, patch: Partial<RoomData>) => {
    setMaps((current) => current.map((map) => map.id === id ? { ...map, ...patch } : map));
  };

  const saveMap = (map: RoomData) => {
    RoomService.saveRoomMeta(map);
    setMaps(RoomService.getAdminRooms());
    setMessage(`${map.name} map metadata saved locally.`);
  };

  const resetMap = (roomId: string) => {
    RoomService.resetRoomMeta(roomId);
    setMaps(RoomService.getAdminRooms());
    setMessage('Map metadata reset to manifest defaults.');
  };

  const patchSelectedObject = (patch: { x?: number; y?: number; direction?: number }) => {
    if (!selectedObject) return;
    const position = {
      ...selectedObject.position,
      x: patch.x ?? selectedObject.position.x,
      y: patch.y ?? selectedObject.position.y,
    };
    onRoomChange(updateCatalogObject(room, selectedObject.id, {
      position,
      direction: patch.direction ?? selectedObject.direction,
    }));
  };

  const removeSelectedObject = () => {
    if (!selectedObject) return;
    const next = deleteRoomObject(room, selectedObject.id);
    onRoomChange(next);
    onSelectedObjectIdChange(next.objects[0]?.id ?? null);
    setMessage(`${selectedObject.id} removed from the draft.`);
  };

  const addObject = (catalogId: FurnitureId) => {
    const next = addCatalogObject(room, catalogId, newPosition);
    onRoomChange(next);
    onSelectedObjectIdChange(next.objects[next.objects.length - 1]?.id ?? null);
    setMessage(`${furnitureCatalog[catalogId].id} added to the draft.`);
  };

  const publishRoom = () => {
    try {
      saveEditableRoom(room);
      setSavedRoomJson(exportEditableRoom(room));
      setMessage('Central Plaza saved in this browser. Reload will keep this version.');
    } catch {
      setMessage('Save failed. Browser storage may be blocked or full; the draft is still open.');
    }
  };

  const resetRoom = () => {
    const next = resetEditableRoom(centralPlazaRoom);
    onRoomChange(next);
    onSelectedObjectIdChange(next.objects[0]?.id ?? null);
    setSavedRoomJson(exportEditableRoom(next));
    setMessage('Central Plaza local override removed.');
  };

  const copyRoomJson = async () => {
    try {
      await navigator.clipboard.writeText(exportEditableRoom(room));
      setMessage('Room JSON copied to clipboard.');
    } catch {
      setMessage('Clipboard blocked. Use browser permissions or DevTools to copy the draft.');
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] h-[62vh] w-full rounded-t-3xl bg-[#061116]/96 text-white shadow-[0_-24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl sm:inset-y-0 sm:left-auto sm:h-auto sm:max-w-[460px] sm:rounded-none sm:shadow-[-24px_0_70px_rgba(0,0,0,.55)]" role="dialog" aria-modal="false" aria-label="Human World admin control panel">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-300">Human World Admin · v1</p>
            <div className="flex items-center gap-2"><h1 className="text-lg font-black">Live Plaza editor</h1><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${hasUnsavedChanges ? 'bg-amber-300/15 text-amber-200' : 'bg-emerald-300/15 text-emerald-200'}`}>{hasUnsavedChanges ? 'Unsaved' : 'Saved'}</span></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close admin panel" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10">
            <X size={18}/>
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 sm:px-6">
          <button type="button" onClick={() => setTab('maps')} className={`${buttonClass} ${tab === 'maps' ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : ''}`}>
            <span className="flex items-center gap-2"><MapPinned size={15}/> Public maps</span>
          </button>
          <button type="button" onClick={() => setTab('objects')} className={`${buttonClass} ${tab === 'objects' ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : ''}`}>
            <span className="flex items-center gap-2"><Box size={15}/> Plaza objects</span>
          </button>
          <p className="ml-auto hidden text-[10px] text-white/35 sm:block">Shift+A toggles admin</p>
        </div>

        <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {tab === 'maps' ? (
            <section className="mx-auto max-w-6xl">
              <div className="mb-4">
                <h2 className="text-base font-black">Public world maps</h2>
                <p className="text-xs text-white/45">Edit world-map position, visibility, capacity and future land sale metadata. Central Plaza uses the isometric editor; Cafe and Gallery still use the legacy renderer.</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {maps.map((map) => (
                  <article key={map.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2"><Building2 size={17} className="text-cyan-300"/><span className="text-sm font-black">{map.id}</span></div>
                      <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[9px] font-bold uppercase text-white/45">{map.type}</span>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold uppercase text-white/45">Display name<input className={fieldClass} value={map.name} onChange={(event) => patchMap(map.id, { name: event.target.value })}/></label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] font-bold uppercase text-white/45">Capacity<input className={fieldClass} type="number" min={1} value={map.capacity} onChange={(event) => patchMap(map.id, { capacity: Math.max(1, Number(event.target.value) || 1) })}/></label>
                        <label className="text-[10px] font-bold uppercase text-white/45">Map top<input className={fieldClass} value={map.top} onChange={(event) => patchMap(map.id, { top: event.target.value })}/></label>
                        <label className="text-[10px] font-bold uppercase text-white/45">Map left<input className={fieldClass} value={map.left} onChange={(event) => patchMap(map.id, { left: event.target.value })}/></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold uppercase text-white/45">Land status
                          <select className={fieldClass} value={map.land_status ?? 'public'} onChange={(event) => patchMap(map.id, { land_status: event.target.value as LandStatus })}>
                            <option value="public">Public</option>
                            <option value="available">Available</option>
                            <option value="owned">Owned</option>
                            <option value="reserved">Reserved</option>
                          </select>
                        </label>
                        <label className="text-[10px] font-bold uppercase text-white/45">Price HUM
                          <input className={fieldClass} type="number" min={0} placeholder="Not for sale" value={map.price_hum ?? ''} onChange={(event) => patchMap(map.id, { price_hum: event.target.value === '' ? null : Math.max(0, Number(event.target.value) || 0) })}/>
                        </label>
                      </div>
                      <label className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/20 p-2 text-xs text-white/65">
                        <input type="checkbox" checked={map.is_public} onChange={(event) => patchMap(map.id, { is_public: event.target.checked })}/>
                        Visible on World Map
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={`${buttonClass} border-emerald-300/25 text-emerald-100`} onClick={() => saveMap(map)}><span className="flex items-center gap-1.5"><Save size={14}/> Save</span></button>
                      <button type="button" className={buttonClass} onClick={() => onEnterRoom(map.id)}>Enter</button>
                      <button type="button" className={buttonClass} onClick={() => resetMap(map.id)}><span className="flex items-center gap-1.5"><RotateCcw size={14}/> Reset</span></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="mx-auto grid max-w-7xl gap-4">
              <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Plaza objects</h2><span className="text-[10px] text-white/35">{room.objects.length}</span></div>
                <p className="mb-2 text-[10px] text-cyan-100/55">Select here or click a mobi in the Plaza. Then click a free tile to move it.</p>
                <div className="max-h-[24vh] space-y-1 overflow-auto pr-1">
                  {room.objects.map((object) => (
                    <button key={object.id} type="button" onClick={() => onSelectedObjectIdChange(object.id)} className={`w-full rounded-lg border px-2.5 py-2 text-left ${selectedObjectId === object.id ? 'border-cyan-300/45 bg-cyan-300/10' : 'border-transparent bg-black/20 hover:bg-white/5'}`}>
                      <p className="truncate text-[11px] font-bold">{object.id}</p>
                      <p className="truncate text-[9px] text-white/35">{object.catalogId ?? object.category} · {object.position.x.toFixed(2)}, {object.position.y.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="space-y-4">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Central Plaza</p><h2 className="text-base font-black">Selected object</h2></div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={publishRoom} className={`${buttonClass} border-emerald-300/25 text-emerald-100`}><span className="flex items-center gap-1.5"><Save size={14}/> Save locally</span></button>
                      <button type="button" onClick={copyRoomJson} className={buttonClass}><span className="flex items-center gap-1.5"><Clipboard size={14}/> Copy JSON</span></button>
                      <button type="button" onClick={resetRoom} className={buttonClass}><span className="flex items-center gap-1.5"><RotateCcw size={14}/> Reset room</span></button>
                    </div>
                  </div>

                  {selectedObject ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-black">{selectedObject.id}</p>
                        <p className="text-[10px] text-white/35">{selectedObject.catalogId ?? 'non-catalog object'} · {selectedObject.category}</p>
                        <img src={selectedObject.asset} alt="" className="mt-3 h-32 w-full rounded-xl border border-white/8 bg-black/20 object-contain p-3"/>
                      </div>
                      <div className="grid content-start gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[10px] font-bold uppercase text-white/45">X<input className={fieldClass} type="number" step=".1" value={selectedObject.position.x} onChange={(event) => patchSelectedObject({ x: Number(event.target.value) || 0 })}/></label>
                          <label className="text-[10px] font-bold uppercase text-white/45">Y<input className={fieldClass} type="number" step=".1" value={selectedObject.position.y} onChange={(event) => patchSelectedObject({ y: Number(event.target.value) || 0 })}/></label>
                        </div>
                        {selectedCatalog && (
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase text-white/45">Direction</p>
                            <div className="flex gap-2">
                              {selectedCatalog.directions.map((direction) => (
                                <button key={direction} type="button" onClick={() => patchSelectedObject({ direction })} className={`${buttonClass} ${selectedObject.direction === direction ? 'border-amber-300/40 text-amber-100' : ''}`}>{direction}°</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <button type="button" onClick={removeSelectedObject} className="mt-2 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/20"><span className="flex items-center justify-center gap-1.5"><Trash2 size={14}/> Remove from draft</span></button>
                      </div>
                    </div>
                  ) : <p className="text-sm text-white/45">Select an object from the list.</p>}
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3"><h2 className="text-sm font-black">Catalog placement</h2><p className="text-[10px] text-white/35">Adds real catalog furniture into the same RoomDefinition used by the live renderer.</p></div>
                  <div className="mb-3 grid grid-cols-[1fr_90px_90px] gap-2">
                    <select className={fieldClass} value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)}>
                      <option value="all">All categories</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <input className={fieldClass} type="number" step=".5" value={newPosition.x} aria-label="New object X" onChange={(event) => setNewPosition((current) => ({ ...current, x: Number(event.target.value) || 0 }))}/>
                    <input className={fieldClass} type="number" step=".5" value={newPosition.y} aria-label="New object Y" onChange={(event) => setNewPosition((current) => ({ ...current, y: Number(event.target.value) || 0 }))}/>
                  </div>
                  <div className="grid max-h-[36vh] grid-cols-2 gap-2 overflow-auto pr-1 sm:grid-cols-3">
                    {catalogItems.map(([catalogId, item]) => (
                      <button key={catalogId} type="button" onClick={() => addObject(catalogId as FurnitureId)} className="rounded-xl border border-white/8 bg-black/20 p-2 text-left hover:border-cyan-300/30 hover:bg-white/5">
                        <img src={item.asset} alt="" className="h-16 w-full object-contain"/>
                        <p className="mt-1 truncate text-[10px] font-black">{item.id}</p>
                        <p className="text-[9px] text-white/35">{item.editorCategory} · {item.footprint[0]}×{item.footprint[1]}</p>
                        <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-cyan-200"><Plus size={11}/> Add at {newPosition.x},{newPosition.y}</p>
                      </button>
                    ))}
                  </div>
                </article>
              </div>

              <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="text-sm font-black">Editor status</h2>
                <p className="mt-2 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.04] p-3 text-xs leading-relaxed text-cyan-50/75">{message}</p>
                <div className="mt-4 space-y-2 text-[10px] text-white/45">
                  <p>✓ Same RoomDefinition as gameplay</p>
                  <p>✓ Catalog placement / move / rotate / delete</p>
                  <p>✓ Seat collision metadata rebuilt when moved</p>
                  <p>✓ Local publish triggers live Plaza reload</p>
                  <p>✓ World-map sale metadata scaffold</p>
                  <p className="pt-2 text-amber-200/70">Next: floor painting, wall editing, click-to-place, backend persistence and real admin RBAC.</p>
                </div>
              </aside>
            </section>
          )}
        </main>

        <footer className="border-t border-white/10 px-4 py-2 text-[10px] text-white/35 sm:px-6">
          {message}
        </footer>
      </div>
    </div>
  );
}
