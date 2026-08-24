import { Heart, Loader2, MapPin, MessageCircle, RefreshCw, Send, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CurrentUser } from '../../App';
import { FeedService } from '../../services/FeedService';
import type { PostData } from '../../services/FeedService';

interface SocialFeedProps {
  onEnterRoom?: (roomId: string) => void;
  currentUser?: CurrentUser;
}

type FeedStatus = 'error' | 'loading' | 'ready';
type ComposerNotice = { tone: 'error' | 'success'; text: string } | null;

const MAX_POST_LENGTH = 280;
const LIKED_POSTS_STORAGE_KEY = 'human-world:feed:liked-posts:v1';

function readLikedPosts() {
  if (typeof window === 'undefined') return new Set<number>();
  try {
    const value = JSON.parse(window.localStorage.getItem(LIKED_POSTS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return new Set<number>();
    return new Set(value.filter((postId): postId is number => Number.isInteger(postId) && postId >= 0));
  } catch {
    return new Set<number>();
  }
}

function persistLikedPosts(postIds: Set<number>) {
  try {
    window.localStorage.setItem(LIKED_POSTS_STORAGE_KEY, JSON.stringify([...postIds]));
  } catch {
    // A blocked storage API should not prevent the in-memory interaction.
  }
}

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function FeedSkeleton() {
  return (
    <div aria-label="Loading feed" className="divide-y divide-zinc-800" role="status">
      {[0, 1, 2].map((item) => (
        <div key={item} className="animate-pulse p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="h-2.5 w-14 rounded bg-zinc-900" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-zinc-800" />
            <div className="h-3 w-4/5 rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedPost({ post, isLiked, isLikePending, onEnterRoom, onLike }: {
  post: PostData;
  isLiked: boolean;
  isLikePending: boolean;
  onEnterRoom?: (roomId: string) => void;
  onLike: (post: PostData) => void;
}) {
  const roomId = post.room_id;

  return (
    <article className="border-b border-zinc-800 p-4 transition-colors hover:bg-zinc-900/50">
      <header className="mb-2 flex items-center gap-2">
        <div aria-hidden="true" className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${post.is_system ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
          {post.author_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{post.author_name}</p>
          <p className="text-xs text-zinc-500">{post.is_system ? 'World guide' : 'Resident'} · {formatRelativeTime(post.created_at)}</p>
        </div>
      </header>

      <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">{post.content}</p>

      {roomId && post.room_name ? (
        <button
          type="button"
          onClick={() => onEnterRoom?.(roomId)}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-blue-400/25 hover:text-blue-300"
        >
          <MapPin aria-hidden="true" size={14}/>
          Visit {post.room_name}
        </button>
      ) : null}

      <footer className="mt-4 flex items-center gap-5 text-zinc-500">
        <button
          type="button"
          aria-label={`${isLiked ? 'Liked' : 'Like'} post by ${post.author_name}`}
          aria-pressed={isLiked}
          disabled={isLiked || isLikePending}
          onClick={() => onLike(post)}
          className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2 transition-colors disabled:cursor-default ${isLiked ? 'text-rose-400' : 'hover:bg-rose-500/10 hover:text-rose-300'}`}
        >
          {isLikePending ? <Loader2 aria-hidden="true" className="animate-spin" size={16}/> : <Heart aria-hidden="true" className={isLiked ? 'fill-current' : ''} size={16}/>}
          <span className="text-xs">{post.likes}</span>
        </button>
        <button type="button" disabled aria-label={`${post.comments} comments, coming soon`} className="flex min-h-9 cursor-not-allowed items-center gap-1.5 rounded-lg px-2 opacity-45">
          <MessageCircle aria-hidden="true" size={16}/>
          <span className="text-xs">{post.comments}</span>
        </button>
        <button type="button" disabled aria-label="Share post, coming soon" className="ml-auto grid h-9 w-9 cursor-not-allowed place-items-center rounded-lg opacity-45">
          <Share2 aria-hidden="true" size={16}/>
        </button>
      </footer>
    </article>
  );
}

export function SocialFeed({ onEnterRoom, currentUser }: SocialFeedProps) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(readLikedPosts);
  const [likePending, setLikePending] = useState<Set<number>>(() => new Set());
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [composerNotice, setComposerNotice] = useState<ComposerNotice>(null);
  const trimmedPost = newPostContent.trim();

  useEffect(() => {
    let active = true;
    setStatus('loading');

    FeedService.getFeed()
      .then((data) => {
        if (!active) return;
        setPosts(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const handleLike = async (post: PostData) => {
    if (likedPosts.has(post.id) || likePending.has(post.id)) return;

    setLikePending((current) => new Set(current).add(post.id));
    try {
      const success = await FeedService.likePost(post.id);
      if (!success) throw new Error('Like rejected');

      setLikedPosts((current) => {
        const next = new Set(current).add(post.id);
        persistLikedPosts(next);
        return next;
      });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: item.likes + 1 } : item));
    } catch {
      setComposerNotice({ tone: 'error', text: 'That reaction could not be saved. Please try again.' });
    } finally {
      setLikePending((current) => {
        const next = new Set(current);
        next.delete(post.id);
        return next;
      });
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser || !trimmedPost || isPosting) return;

    setIsPosting(true);
    setComposerNotice(null);
    try {
      const newPost = await FeedService.createPost(currentUser.id, currentUser.username, trimmedPost);
      if (!newPost) throw new Error('Post rejected');

      setPosts((current) => [newPost, ...current]);
      setNewPostContent('');
      setComposerNotice({ tone: 'success', text: 'Your update is live.' });
    } catch {
      setComposerNotice({ tone: 'error', text: 'Your update could not be posted. Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-zinc-950 pb-16 pt-safe text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/85 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/70">Human World</p>
          <h1 className="text-xl font-bold">Discovery Feed</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md">
        {currentUser ? (
          <section aria-labelledby="composer-title" className="border-b border-zinc-800 bg-zinc-900/30 p-4">
            <h2 id="composer-title" className="mb-2 text-sm font-semibold text-zinc-200">Share an update</h2>
            <textarea
              aria-label="Post content"
              value={newPostContent}
              maxLength={MAX_POST_LENGTH}
              onChange={(event) => {
                setNewPostContent(event.target.value);
                setComposerNotice(null);
              }}
              placeholder="What’s happening in your part of the World?"
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-cyan-400/35 focus:outline-none"
              rows={3}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`text-xs ${newPostContent.length >= MAX_POST_LENGTH ? 'text-amber-300' : 'text-zinc-600'}`}>{newPostContent.length}/{MAX_POST_LENGTH}</span>
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={isPosting || !trimmedPost}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isPosting ? <Loader2 aria-hidden="true" className="animate-spin" size={15}/> : <Send aria-hidden="true" size={15}/>}
                {isPosting ? 'Posting…' : 'Post update'}
              </button>
            </div>
            <div aria-live="polite" className="min-h-5 pt-2 text-xs">
              {composerNotice ? <p className={composerNotice.tone === 'error' ? 'text-rose-300' : 'text-emerald-300'}>{composerNotice.text}</p> : null}
            </div>
          </section>
        ) : null}

        {status === 'loading' && posts.length === 0 ? <FeedSkeleton /> : null}

        {status === 'error' ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-zinc-200">The feed could not load.</p>
            <p className="mt-1 text-sm text-zinc-500">Check your connection and try again.</p>
            <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
              <RefreshCw aria-hidden="true" size={15}/>
              Retry
            </button>
          </div>
        ) : null}

        {status === 'ready' && posts.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-zinc-500">No updates yet. Be the first human to post.</div>
        ) : null}

        {posts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            isLiked={likedPosts.has(post.id)}
            isLikePending={likePending.has(post.id)}
            onEnterRoom={onEnterRoom}
            onLike={handleLike}
          />
        ))}
      </div>
    </div>
  );
}
