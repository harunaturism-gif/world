import { supabase } from '../lib/supabase';

export interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  verification_status: boolean;
  avatar_url: string | null;
  xp: number;
  level: number;
  created_at: string;
}

const mockProfiles = new Map<string, ProfileData>();
const mockFollows = new Set<string>();

function getLocalProfile(username: string): ProfileData {
  const existing = Array.from(mockProfiles.values()).find((profile) => profile.username === username);
  if (existing) return existing;

  const profile: ProfileData = {
    id: `mock-${username}`,
    username,
    bio: 'Local development profile.',
    verification_status: true,
    avatar_url: null,
    xp: 12,
    level: 2,
    created_at: new Date().toISOString(),
  };
  mockProfiles.set(profile.id, profile);
  return profile;
}

function getLocalFollowersCount(userId: string) {
  return Array.from(mockFollows).filter((follow) => follow.endsWith(`:${userId}`)).length;
}

function getLocalFollowingCount(userId: string) {
  return Array.from(mockFollows).filter((follow) => follow.startsWith(`${userId}:`)).length;
}

function toggleLocalFollow(followerId: string, followingId: string, isFollowing: boolean) {
  const key = `${followerId}:${followingId}`;
  if (isFollowing) mockFollows.delete(key);
  else mockFollows.add(key);
  return true;
}

export const ProfileService = {
  async getProfile(username: string): Promise<ProfileData | null> {
    if (!supabase) return getLocalProfile(username);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) throw new Error('Supabase profile fail');
      return data as ProfileData;
    } catch {
      return getLocalProfile(username);
    }
  },

  async getFollowersCount(userId: string): Promise<number> {
    if (!supabase) return getLocalFollowersCount(userId);

    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) throw new Error('Supabase count fail');
      return count || 0;
    } catch {
      return getLocalFollowersCount(userId);
    }
  },

  async getFollowingCount(userId: string): Promise<number> {
    if (!supabase) return getLocalFollowingCount(userId);

    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (error) throw new Error('Supabase count fail');
      return count || 0;
    } catch {
      return getLocalFollowingCount(userId);
    }
  },

  async checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!supabase) return mockFollows.has(`${followerId}:${followingId}`);

    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) throw new Error('Supabase count fail');
      return count ? count > 0 : false;
    } catch {
      return mockFollows.has(`${followerId}:${followingId}`);
    }
  },

  async toggleFollow(followerId: string, followingId: string, isFollowing: boolean): Promise<boolean> {
    if (!supabase) return toggleLocalFollow(followerId, followingId, isFollowing);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);
        if (error) throw new Error('Supabase delete fail');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: followerId, following_id: followingId });
        if (error) throw new Error('Supabase insert fail');
      }
      return true;
    } catch {
      return toggleLocalFollow(followerId, followingId, isFollowing);
    }
  },
};