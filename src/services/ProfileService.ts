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

export const ProfileService = {
  async getProfile(username: string): Promise<ProfileData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      console.error("Error fetching profile", error);
      return null;
    }
    return data as ProfileData;
  },

  async getFollowersCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error) {
      console.error("Error fetching followers", error);
      return 0;
    }
    return count || 0;
  },

  async getFollowingCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) {
      console.error("Error fetching following", error);
      return 0;
    }
    return count || 0;
  },

  async checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error("Error checking follow status", error);
      return false;
    }
    return count ? count > 0 : false;
  },

  async toggleFollow(followerId: string, followingId: string, isFollowing: boolean): Promise<boolean> {
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      if (error) {
         console.error("Error unfollowing", error);
         return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });
      if (error) {
         console.error("Error following", error);
         return false;
      }
      return true;
    }
  }
};
