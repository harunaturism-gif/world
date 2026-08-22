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

let mockIdCounter = 100;
const mockPosts: PostData[] = [];

function getLocalFeed() {
  return [...mockPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function likeLocalPost(postId: number) {
  const post = mockPosts.find((candidate) => candidate.id === postId);
  if (post) post.likes += 1;
  return true;
}

function createLocalPost(
  authorId: string,
  authorName: string,
  content: string,
  roomId?: string,
  roomName?: string,
): PostData {
  const post: PostData = {
    id: ++mockIdCounter,
    author_id: authorId,
    author_name: authorName,
    content,
    room_id: roomId || null,
    room_name: roomName || null,
    likes: 0,
    comments: 0,
    is_system: false,
    created_at: new Date().toISOString(),
  };
  mockPosts.push(post);
  return post;
}

export const FeedService = {
  async getFeed(): Promise<PostData[]> {
    if (!supabase) return getLocalFeed();

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) throw new Error('Supabase feed empty/fail');
      return data as PostData[];
    } catch {
      return getLocalFeed();
    }
  },

  async likePost(postId: number): Promise<boolean> {
    if (!supabase) return likeLocalPost(postId);

    try {
      const { error } = await supabase.rpc('increment_post_likes', { post_id: postId });
      if (error) throw new Error('Supabase rpc fail');
      return true;
    } catch {
      return likeLocalPost(postId);
    }
  },

  async createPost(
    authorId: string,
    authorName: string,
    content: string,
    roomId?: string,
    roomName?: string,
  ): Promise<PostData | null> {
    if (!supabase) return createLocalPost(authorId, authorName, content, roomId, roomName);

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

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([newPost])
        .select()
        .single();

      if (error) throw new Error('Supabase insert fail');
      return data as PostData;
    } catch {
      return createLocalPost(authorId, authorName, content, roomId, roomName);
    }
  },
};