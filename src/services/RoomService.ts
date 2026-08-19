import { supabase } from '../lib/supabase';

export interface RoomData {
  id: string;
  name: string;
  owner_id: string | null;
  type: string;
  capacity: number;
  is_public: boolean;
  created_at: string;
  top: string;
  left: string;
  presence?: number;
}

export const demoRooms: RoomData[] = [
  { id: 'central-plaza', name: 'Central Plaza', type: 'plaza', capacity: 50, owner_id: null, is_public: true, created_at: '', top: '48%', left: '50%', presence: 5 },
  { id: 'lunas-cafe', name: "Luna's Cafe", type: 'cafe', capacity: 24, owner_id: null, is_public: true, created_at: '', top: '68%', left: '76%', presence: 3 },
  { id: 'human-gallery', name: 'Human Gallery', type: 'gallery', capacity: 30, owner_id: null, is_public: true, created_at: '', top: '27%', left: '25%', presence: 2 },
];

export const RoomService = {
  async getRooms(): Promise<RoomData[]> {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) return demoRooms;
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true);
      if (error || !data || data.length === 0) throw new Error("Supabase empty/fail");
      const mapped = (data as RoomData[]).map(r => ({ ...r, presence: 5 })); // Stubbed static presence, waiting on real WS presence tracking endpoint
      return mapped as RoomData[];
    } catch {
      return demoRooms;
    }
  },

  getRoom(id: string) { return demoRooms.find((room) => room.id === id) ?? demoRooms[0]; },
  async createRoom(name: string, type: string, ownerId: string): Promise<RoomData> {
    const room: RoomData = { id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-demo`, name, type: type === 'cafe' || type === 'gallery' ? type : 'plaza', owner_id: ownerId, capacity: 20, is_public: true, created_at: new Date().toISOString(), top: '50%', left: '50%', presence: 1 };
    return room;
  },
};
