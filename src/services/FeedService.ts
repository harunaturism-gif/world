import { persistenceRequest, useDevelopmentPersistence } from './persistenceApi';

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
const demoAuthor = { id: 'development-demo-actor', username: 'DevCitizen' };

export const FeedService = {
  async getFeed(): Promise<PostData[]> {
    if (useDevelopmentPersistence) return [...mockPosts].reverse();
    return (await persistenceRequest<{ posts: PostData[] }>('/feed')).posts;
  },
  async likePost(postId: number): Promise<boolean> {
    if (useDevelopmentPersistence) {
      const post = mockPosts.find((candidate) => candidate.id === postId);
      if (post) post.likes += 1;
      return Boolean(post);
    }
    await persistenceRequest<{ likes: number }>(`/posts/${postId}/like`, { method: 'PUT' });
    return true;
  },
  async createPost(content: string, roomId: string | null = null): Promise<PostData | null> {
    if (useDevelopmentPersistence) {
      const post: PostData = { id: ++mockIdCounter, author_id: demoAuthor.id, author_name: demoAuthor.username, content, room_id: roomId, room_name: null, likes: 0, comments: 0, is_system: false, created_at: new Date().toISOString() };
      mockPosts.push(post);
      return post;
    }
    return (await persistenceRequest<{ post: PostData }>('/posts', { method: 'POST', body: JSON.stringify({ content, roomId }) })).post;
  },
};
