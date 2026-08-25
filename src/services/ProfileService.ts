import { persistenceRequest, useDevelopmentPersistence } from './persistenceApi';

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
const demoActor = 'development-demo-actor';

function getLocalProfile(username: string): ProfileData {
  const existing = [...mockProfiles.values()].find((profile) => profile.username === username);
  if (existing) return existing;
  const profile: ProfileData = { id: `development-${username}`, username, bio: 'Local development profile.', verification_status: true, avatar_url: null, xp: 12, level: 2, created_at: new Date().toISOString() };
  mockProfiles.set(profile.id, profile);
  return profile;
}

export const ProfileService = {
  async getProfile(username: string): Promise<ProfileData | null> {
    if (useDevelopmentPersistence) return getLocalProfile(username);
    return (await persistenceRequest<{ profile: ProfileData }>(`/profiles/${encodeURIComponent(username)}`)).profile;
  },
  async getFollowersCount(userId: string): Promise<number> {
    if (useDevelopmentPersistence) return [...mockFollows].filter((key) => key.endsWith(`:${userId}`)).length;
    return (await persistenceRequest<{ followers: number; following: number }>(`/profiles/${encodeURIComponent(userId)}/counts`)).followers;
  },
  async getFollowingCount(userId: string): Promise<number> {
    if (useDevelopmentPersistence) return [...mockFollows].filter((key) => key.startsWith(`${userId}:`)).length;
    return (await persistenceRequest<{ followers: number; following: number }>(`/profiles/${encodeURIComponent(userId)}/counts`)).following;
  },
  async checkIsFollowing(followingId: string): Promise<boolean> {
    if (useDevelopmentPersistence) return mockFollows.has(`${demoActor}:${followingId}`);
    return (await persistenceRequest<{ following: boolean }>(`/follows/${encodeURIComponent(followingId)}`)).following;
  },
  async toggleFollow(followingId: string, isFollowing: boolean): Promise<boolean> {
    if (useDevelopmentPersistence) {
      const key = `${demoActor}:${followingId}`;
      if (isFollowing) mockFollows.delete(key); else mockFollows.add(key);
      return true;
    }
    await persistenceRequest<{ following: boolean }>(`/follows/${encodeURIComponent(followingId)}`, { method: isFollowing ? 'DELETE' : 'PUT' });
    return true;
  },
};
