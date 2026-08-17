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

const mockRooms: RoomData[] = [];

export const RoomService = {
  async getRooms(): Promise<RoomData[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true);
      if (error || !data || data.length === 0) throw new Error("Supabase empty/fail");
      const mapped = (data as RoomData[]).map(r => ({ ...r, presence: 5 })); // Stubbed static presence, waiting on real WS presence tracking endpoint
      return mapped;
    } catch {
      return mockRooms.map(r => ({ ...r, presence: 5 })); // Stubbed static presence
    }
  },

  async createRoom(name: string, type: string, ownerId: string): Promise<RoomData | null> {
    const newRoomId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const top = `${Math.floor(Math.random() * 60 + 20)}%`;
    const left = `${Math.floor(Math.random() * 60 + 20)}%`;

    const newRoom = {
      id: newRoomId,
      name,
      type,
      owner_id: ownerId,
      capacity: 50,
      is_public: true,
      top,
      left
    };

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([newRoom])
        .select()
        .single();
      if (error) throw new Error("Supabase insert fail");
      return data as RoomData;
    } catch {
      const r = { ...newRoom, created_at: new Date().toISOString() };
      mockRooms.push(r);
      return r;
    }
  }
};
