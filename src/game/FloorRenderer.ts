import * as PIXI from 'pixi.js';
import { isoToScreen, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import type { RoomDefinition } from './roomEngine';

const tileHash = (x: number, y: number) => Math.abs((x * 73856093) ^ (y * 19349663));

export function renderFloor(scene: PIXI.Container, room: RoomDefinition, textureFor: (url: string) => PIXI.Texture) {
  for (let x = room.floor.minX; x <= room.floor.maxX; x += 1) {
    for (let y = room.floor.minY; y <= room.floor.maxY; y += 1) {
      const edge = x === room.floor.minX || x === room.floor.maxX || y === room.floor.minY || y === room.floor.maxY;
      const onWalkway = Math.abs(x) <= 1 || Math.abs(y) <= 1 || Math.hypot(x, y) < 3.1;
      const variants = onWalkway ? room.floor.pathAssets : room.floor.assets;
      const asset = edge ? room.floor.boundaryAsset : variants[tileHash(x, y) % variants.length];
      const tile = new PIXI.Sprite(textureFor(asset));
      const screen = isoToScreen({ x, y });
      tile.anchor.set(0.5);
      tile.width = TILE_WIDTH + 2;
      tile.height = TILE_HEIGHT + 1;
      tile.position.set(screen.x, screen.y);
      tile.zIndex = -10000 + screen.y;
      scene.addChild(tile);
    }
  }
}
