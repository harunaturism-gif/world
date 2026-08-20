import * as PIXI from 'pixi.js';
import { isoDepth, isoToScreen, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import type { RoomDefinition } from './roomEngine';
import type { RoomGeometry } from './RoomGeometry';

const tileHash = (x: number, y: number) => Math.abs((x * 73856093) ^ (y * 19349663));

export function renderFloor(scene: PIXI.Container, room: RoomDefinition, geometry: RoomGeometry, textureFor: (url: string) => PIXI.Texture) {
  for (const cell of geometry.allCells) {
    const variants = room.floor.materials[cell.material];
    const asset = variants[tileHash(cell.x, cell.y) % variants.length];
    const tile = new PIXI.Sprite(textureFor(asset));
    const world = { x: cell.x, y: cell.y, z: cell.elevation };
    const screen = isoToScreen(world);
    tile.anchor.set(0.5);
    tile.width = TILE_WIDTH + 2;
    tile.height = TILE_HEIGHT + 1;
    tile.position.set(screen.x, screen.y);
    tile.zIndex = -10000 + isoDepth(world);
    tile.alpha = cell.walkable ? 1 : 0.98;
    scene.addChild(tile);
  }
}
