import { supabase } from '../lib/supabase';

export interface PostData {
  id: number;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  room_id: string | null;
  room_name: string | null;
  likes: number;
  comments: number;
  is_system: boolean;
}

export const FeedService = {
  async getFeed(): Promise<PostData[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error("Error fetching feed", error);
      return [];
    }
    return data as PostData[];
  },

  async createPost(authorId: string, authorName: string, content: string, roomId?: string, roomName?: string): Promise<PostData | null> {
    const newPost = {
      author_id: authorId,
      author_name: authorName,
      content,
      room_id: roomId || null,
      room_name: roomName || null,
      likes: 0,
      comments: 0,
      is_system: false,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([newPost])
      .select()
      .single();

    if (error) {
      console.error("Error creating post", error);
      return null;
    }
    return data as PostData;
  }
};
