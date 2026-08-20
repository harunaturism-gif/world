import { CollisionShape, IsoPoint } from './isometric';

export const worldAssets = {
  ground: '/assets/world/ground/plaza-tile.svg',
  cafe: '/assets/world/buildings/cafe.png',
  stall: '/assets/world/props/market-stall.png',
  tree: '/assets/world/vegetation/tree.png',
  fountain: '/assets/world/props/fountain.png',
  bench: '/assets/world/props/bench.png',
  lamp: '/assets/world/props/lamp.png',
  planter: '/assets/world/vegetation/planter.png',
  sign: '/assets/world/props/sign.png',
  character: '/assets/world/characters/prototype-character.svg',
} as const;

export type WorldAssetKey = keyof typeof worldAssets;
export interface WorldObjectDefinition {
  id: string;
  asset: WorldAssetKey;
  position: IsoPoint;
  displayWidth: number;
  collision?: CollisionShape;
  interaction?: string;
  depthBias?: number;
}

export const worldObjects: WorldObjectDefinition[] = [
  { id: 'cafe', asset: 'cafe', position: { x: -2.7, y: 3 }, displayWidth: 235, collision: { kind: 'rect', x: -2.7, y: 3, width: 2.8, height: 1.9 }, interaction: 'The cafe entrance glows warmly. It is open for the local demo.' },
  { id: 'market', asset: 'stall', position: { x: 2.7, y: -2.5 }, displayWidth: 225, collision: { kind: 'rect', x: 2.7, y: -2.5, width: 2.2, height: 1.5 }, interaction: 'The market stall is stocked with colorful local produce.' },
  { id: 'tree', asset: 'tree', position: { x: 3.8, y: .8 }, displayWidth: 275, collision: { kind: 'circle', x: 3.8, y: .8, radius: .72 } },
  { id: 'fountain', asset: 'fountain', position: { x: 0, y: -.1 }, displayWidth: 245, collision: { kind: 'circle', x: 0, y: -.1, radius: 1.25 }, interaction: 'The Atlas Fountain hums with a soft blue light.' },
  { id: 'bench', asset: 'bench', position: { x: -3.7, y: -.4 }, displayWidth: 165, collision: { kind: 'rect', x: -3.7, y: -.4, width: 1.8, height: .65 } },
  { id: 'lamp', asset: 'lamp', position: { x: 3.6, y: 3 }, displayWidth: 92, collision: { kind: 'circle', x: 3.6, y: 3, radius: .35 } },
  { id: 'planter', asset: 'planter', position: { x: -4.2, y: .6 }, displayWidth: 95, collision: { kind: 'circle', x: -4.2, y: .6, radius: .48 } },
  { id: 'sign', asset: 'sign', position: { x: -1.25, y: -2.2 }, displayWidth: 58, collision: { kind: 'circle', x: -1.25, y: -2.2, radius: .28 }, depthBias: 2 },
];
