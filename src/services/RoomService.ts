import { supabase } from '../lib/supabase';

export interface RoomData {
  id: string;
  name: string;
  owner_id: string | null;
  type: string;
  capacity: number;
  is_public: boolean;
  created_at: string;
  // Metadata for MVP map rendering
  top: string;
  left: string;
}

export const RoomService = {
  async getRooms(): Promise<RoomData[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_public', true);

    if (error || !data) {
      console.error("Error fetching rooms", error);
      return [];
    }
    return data as RoomData[];
  },

  async createRoom(name: string, type: string, ownerId: string): Promise<RoomData | null> {
    const newRoomId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

    // Assign random coordinate for MVP Map representation
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

    const { data, error } = await supabase
      .from('rooms')
      .insert([newRoom])
      .select()
      .single();

    if (error) {
      console.error("Error creating room", error);
      return null;
    }
    return data as RoomData;
  }
};
