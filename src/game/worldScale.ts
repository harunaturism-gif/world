/** Canonical Human World isometric scale. All room assets and hit footprints use this contract. */
export const WORLD_SCALE = {
  tileWidth: 96,
  tileHeight: 48,
  elevationHeight: 24,
  avatarHeight: 82,
  wallHeight: 88,
  doorWidthTiles: 1.5,
  furniture: {
    chair: { footprint: [1, 1] as const, displayWidth: 58, height: 58 },
    table: { footprint: [1, 1] as const, displayWidth: 86, height: 62 },
    bench: { footprint: [2, 1] as const, displayWidth: 126, height: 70 },
    sofa: { footprint: [2, 1] as const, displayWidth: 132, height: 76 },
    lamp: { footprint: [1, 1] as const, displayWidth: 54, height: 116 },
    plant: { footprint: [1, 1] as const, displayWidth: 72, height: 76 },
    communityBoard: { footprint: [2, 1] as const, displayWidth: 118, height: 112 },
    cafeCounter: { footprint: [3, 1.5] as const, displayWidth: 176, height: 112 },
    marketStall: { footprint: [3, 2] as const, displayWidth: 188, height: 142 },
    fountain: { footprint: [3, 3] as const, displayWidth: 220, height: 166 },
    divider: { footprint: [2, 0.5] as const, displayWidth: 112, height: 62 },
  },
} as const;
