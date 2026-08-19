export interface AvatarState {
  baseColor: number;
  hairColor: number;
  outfitColor: number;
  accessoryColor: number;
  hair: 'short' | 'wave' | 'buzz';
}

const storageKey = (id: string) => `human-world:demo-avatar:${id}`;
const defaults: AvatarState = { baseColor: 0xf3b48d, hairColor: 0x3c2850, outfitColor: 0x5c7cfa, accessoryColor: 0xffd166, hair: 'wave' };

export const AvatarService = {
  saveAvatar(id: string, state: AvatarState) {
    localStorage.setItem(storageKey(id), JSON.stringify(state));
  },

  getAvatar(id: string | null): AvatarState {
    if (!id) return defaults;
    try { const saved = localStorage.getItem(storageKey(id)); return saved ? { ...defaults, ...JSON.parse(saved) } : defaults; } catch { return defaults; }
  }
};
