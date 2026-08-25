import { Heart, MessageCircle, Share2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FeedService, PostData } from '../../services/FeedService';
import { CurrentUser } from '../../App';

interface SocialFeedProps {
  onEnterRoom?: (roomId: string) => void;
  currentUser?: CurrentUser;
}

export function SocialFeed({ onEnterRoom, currentUser }: SocialFeedProps) {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const handleLike = async (id: number) => {
    await FeedService.likePost(id);
    // Refresh the feed to get updated data from the source of truth
    loadFeed();
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    const data = await FeedService.getFeed();
    // Default fallback posts if DB is empty
    if (data.length === 0) {
       setPosts([
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
          }
       ]);
    } else {
       setPosts(data);
    }
    setLoading(false);
  }

  const handleCreatePost = async () => {
    if (!currentUser || !newPostContent.trim()) return;
    setIsPosting(true);
    const newPost = await FeedService.createPost(newPostContent);
    if (newPost) {
      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
    }
    setIsPosting(false);
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-y-auto pt-safe pb-16">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-10 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Discovery Feed</h1>
      </div>

      <div className="max-w-md mx-auto">

        {currentUser && (
          <div className="border-b border-zinc-800 p-4 bg-zinc-900/30">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's happening in your part of the World?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-zinc-700 resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCreatePost}
                disabled={isPosting || !newPostContent.trim()}
                className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50 hover:bg-zinc-200 transition-colors"
              >
                {isPosting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">Loading feed...</div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="border-b border-zinc-800 p-4 hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  post.is_system ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {post.author_name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-medium text-sm">{post.author_name}</span>
                    {!post.is_system && <span className="text-blue-500 text-xs">✓</span>}
                  </div>
                  <div className="text-zinc-500 text-xs">{getTimeAgo(post.created_at)}</div>
                </div>
              </div>

              <p className="text-zinc-300 text-sm mb-3">{post.content}</p>

              {post.room_id && post.room_name && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEnterRoom?.(post.room_id as string)}
                    className="flex items-center gap-1 text-zinc-500 hover:text-blue-400 text-xs font-medium transition-colors bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800"
                  >
                    <MapPin size={14} />
                    Visit {post.room_name}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-6 mt-4 text-zinc-500">
                <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 transition-colors ${likedPosts.has(post.id) ? 'text-rose-400' : 'hover:text-rose-400'}`}>
                  <Heart size={16} className={likedPosts.has(post.id) ? "fill-current" : ""} />
                  <span className="text-xs">{post.likes + (likedPosts.has(post.id) ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <MessageCircle size={16} />
                  <span className="text-xs">{post.comments}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
