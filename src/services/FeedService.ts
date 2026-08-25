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
const demoAuthor = { id: 'development-demo-actor', username: 'DevCitizen' };
const mockPosts: PostData[] = [
  {
    id: 1,
    author_id: 'luna',
    author_name: 'Luna',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: 'Just finished decorating the demo cafe! Open for visitors now.',
    room_id: 'lunas-cafe',
    room_name: "Luna's Cafe",
    likes: 124,
    comments: 18,
    is_system: false,
  },
  {
    id: 2,
    author_id: 'demo-guide',
    author_name: 'Demo Guide',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    content: 'Central Plaza is open. Meet the four demo residents by the fountain.',
    room_id: 'central-plaza',
    room_name: 'Central Plaza',
    likes: 89,
    comments: 5,
    is_system: true,
  },
];

function getLocalFeed() {
  return mockPosts
    .map((post) => ({ ...post }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function likeLocalPost(postId: number) {
  const post = mockPosts.find((candidate) => candidate.id === postId);
  if (!post) return false;
  post.likes += 1;
  return true;
}

function createLocalPost(
  content: string,
  roomId: string | null,
): PostData {
  const post: PostData = {
    id: ++mockIdCounter,
    author_id: demoAuthor.id,
    author_name: demoAuthor.username,
    content,
    room_id: roomId,
    room_name: null,
    likes: 0,
    comments: 0,
    is_system: false,
    created_at: new Date().toISOString(),
  };
  mockPosts.push(post);
  return { ...post };
}

export const FeedService = {
  async getFeed(): Promise<PostData[]> {
    if (useDevelopmentPersistence) return getLocalFeed();
    return (await persistenceRequest<{ posts: PostData[] }>('/feed')).posts;
  },
  async likePost(postId: number): Promise<boolean> {
    if (useDevelopmentPersistence) {
      return likeLocalPost(postId);
    }
    await persistenceRequest<{ likes: number }>(`/posts/${postId}/like`, { method: 'PUT' });
    return true;
  },
  async createPost(content: string, roomId: string | null = null): Promise<PostData | null> {
    if (useDevelopmentPersistence) {
      return createLocalPost(content, roomId);
    }
    return (await persistenceRequest<{ post: PostData }>('/posts', { method: 'POST', body: JSON.stringify({ content, roomId }) })).post;
  },
};
