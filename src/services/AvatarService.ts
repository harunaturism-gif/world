import { persistenceRequest, useDevelopmentPersistence } from './persistenceApi';

export interface AvatarState {
  baseColor: number; hairColor: number; outfitColor: number; accessoryColor: number;
  hair: 'short' | 'wave' | 'buzz';
}

const storageKey = 'human-world:development-avatar';
const defaults: AvatarState = { baseColor: 0xf3b48d, hairColor: 0x3c2850, outfitColor: 0x5c7cfa, accessoryColor: 0xffd166, hair: 'wave' };
let cachedAvatar = defaults;

function readDevelopmentAvatar(): AvatarState {
  try { const saved = localStorage.getItem(storageKey); return saved ? { ...defaults, ...JSON.parse(saved) } : defaults; }
  catch { return defaults; }
}

export const AvatarService = {
  getCachedAvatar(): AvatarState { return useDevelopmentPersistence ? readDevelopmentAvatar() : cachedAvatar; },
  async getAvatar(): Promise<AvatarState> {
    if (useDevelopmentPersistence) return readDevelopmentAvatar();
    const { appearance } = await persistenceRequest<{ appearance: AvatarState | null }>('/avatar');
    cachedAvatar = appearance ?? defaults;
    return cachedAvatar;
  },
  async saveAvatar(state: AvatarState): Promise<void> {
    if (useDevelopmentPersistence) { localStorage.setItem(storageKey, JSON.stringify(state)); cachedAvatar = state; return; }
    cachedAvatar = (await persistenceRequest<{ appearance: AvatarState }>('/avatar', { method: 'PUT', body: JSON.stringify(state) })).appearance;
  },
};
