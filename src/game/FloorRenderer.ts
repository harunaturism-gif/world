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

    const detailSeed = tileHash(cell.x + 17, cell.y - 11);
    if (detailSeed % (cell.material === 'garden' ? 3 : 6) === 0) {
      const detail = new PIXI.Graphics();
      if (cell.material === 'garden') {
        detail.lineStyle(1.7, detailSeed % 2 === 0 ? 0xc9d590 : 0x315f54, 0.26);
        detail.moveTo(-8, 2);
        detail.lineTo(-4, -3);
        detail.moveTo(1, 5);
        detail.lineTo(5, 0);
        detail.moveTo(9, 3);
        detail.lineTo(12, -1);
      } else {
        const warm = cell.material === 'platform' || cell.material === 'path';
        detail.beginFill(warm ? 0x756f5f : 0x40665f, 0.09);
        detail.drawEllipse(-11 + (detailSeed % 18), 1, 7 + (detailSeed % 5), 2.4);
        detail.endFill();
        detail.lineStyle(1.2, warm ? 0xf2e2b8 : 0xc9d6c8, 0.11);
        detail.moveTo(-18, 5);
        detail.lineTo(-5, -1);
      }
      detail.position.set(screen.x, screen.y - 1);
      detail.rotation = ((detailSeed % 5) - 2) * 0.08;
      detail.zIndex = tile.zIndex + 0.2;
      scene.addChild(detail);
    }
  }
}
