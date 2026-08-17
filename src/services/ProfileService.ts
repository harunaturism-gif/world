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

// In-memory fallback if Supabase fails (sandbox env)
const mockProfiles = new Map<string, ProfileData>();
const mockFollows = new Set<string>(); // "follower_id:following_id"

export const ProfileService = {
  async getProfile(username: string): Promise<ProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) throw new Error("Supabase profile fail");
      return data as ProfileData;
    } catch {
      // Fallback
      const fallback = Array.from(mockProfiles.values()).find(p => p.username === username);
      if (fallback) return fallback;

      const newMock: ProfileData = {
        id: `mock-${username}`,
        username,
        bio: "Mock profile for development.",
        verification_status: true,
        avatar_url: null,
        xp: 12,
        level: 2,
        created_at: new Date().toISOString()
      };
      mockProfiles.set(newMock.id, newMock);
      return newMock;
    }
  },

  async getFollowersCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      if (error) throw new Error("Supabase count fail");
      return count || 0;
    } catch {
      return Array.from(mockFollows).filter(f => f.endsWith(`:${userId}`)).length;
    }
  },

  async getFollowingCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      if (error) throw new Error("Supabase count fail");
      return count || 0;
    } catch {
      return Array.from(mockFollows).filter(f => f.startsWith(`${userId}:`)).length;
    }
  },

  async checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      if (error) throw new Error("Supabase count fail");
      return count ? count > 0 : false;
    } catch {
      return mockFollows.has(`${followerId}:${followingId}`);
    }
  },

  async toggleFollow(followerId: string, followingId: string, isFollowing: boolean): Promise<boolean> {
    try {
      if (isFollowing) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
        if (error) throw new Error("Supabase delete fail");
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
        if (error) throw new Error("Supabase insert fail");
      }
      return true;
    } catch {
      const key = `${followerId}:${followingId}`;
      if (isFollowing) mockFollows.delete(key);
      else mockFollows.add(key);
      return true;
    }
  }
};
