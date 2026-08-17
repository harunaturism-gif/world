export interface AvatarState {
  baseColor: number;
}

const mockAvatarStore = new Map<string, AvatarState>();

export const AvatarService = {
  saveAvatar(id: string, state: AvatarState) {
    mockAvatarStore.set(id, state);
  },

  getAvatar(id: string | null): AvatarState {
    if (!id) return { baseColor: 0x3b82f6 };
    if (mockAvatarStore.has(id)) {
      return mockAvatarStore.get(id)!;
    }
    // Pseudo-random deterministic color based on ID for fallback
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return { baseColor: parseInt("00000".substring(0, 6 - c.length) + c, 16) };
  }
};
