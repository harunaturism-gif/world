import * as PIXI from 'pixi.js';
import { ELEVATION_HEIGHT, isoDepth, isoToScreen } from './isometric';
import type { RoomWallDefinition } from './roomEngine';
import type { RoomGeometry } from './RoomGeometry';

const edgeColor = 0x284b4b;
const edgeTop = 0xb9b78f;

function renderTerrainEdges(scene: PIXI.Container, geometry: RoomGeometry) {
  for (const cell of geometry.allCells) {
    const center = isoToScreen({ x: cell.x, y: cell.y, z: cell.elevation });
    const depth = isoDepth({ x: cell.x, y: cell.y, z: cell.elevation });
    const east = geometry.cellAtCoordinates(cell.x + 1, cell.y);
    const south = geometry.cellAtCoordinates(cell.x, cell.y + 1);
    const eastDrop = east ? Math.max(0, (cell.elevation - east.elevation) * ELEVATION_HEIGHT) : 11;
    const southDrop = south ? Math.max(0, (cell.elevation - south.elevation) * ELEVATION_HEIGHT) : 11;
    const faces: { exposed: boolean; outer: boolean; points: number[] }[] = [
      { exposed: !east || eastDrop > 1, outer: !east, points: [center.x + 64, center.y, center.x, center.y + 32, center.x, center.y + 32 + eastDrop, center.x + 64, center.y + eastDrop] },
      { exposed: !south || southDrop > 1, outer: !south, points: [center.x, center.y + 32, center.x - 64, center.y, center.x - 64, center.y + southDrop, center.x, center.y + 32 + southDrop] },
    ];
    faces.forEach(({ exposed, outer, points }, index) => {
      if (!exposed) return;
      const face = new PIXI.Graphics();
      face.beginFill(outer ? (index === 0 ? edgeColor : 0x315b57) : 0x8f876e, outer ? 1 : 0.82);
      face.drawPolygon(points);
      face.endFill();
      face.lineStyle(1.5, outer ? edgeTop : 0xe0d19e, outer ? 0.42 : 0.56);
      face.moveTo(points[0], points[1]);
      face.lineTo(points[2], points[3]);
      face.zIndex = -9000 + depth + index;
      scene.addChild(face);
    });
  }
}

function wallPalette(wall: RoomWallDefinition) {
  if (wall.color !== undefined) return wall.color;
  if (wall.kind === 'fence') return 0x315f62;
  if (wall.kind === 'wall') return 0x736f75;
  return 0x667d73;
}

function renderWall(scene: PIXI.Container, wall: RoomWallDefinition, textureFor?: (url: string) => PIXI.Texture) {
  if (wall.asset && textureFor) {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(wall.to.x - wall.from.x), Math.abs(wall.to.y - wall.from.y))));
    for (let index = 0; index < steps; index += 1) {
      const progress = (index + 0.5) / steps;
      const point = {
        x: wall.from.x + (wall.to.x - wall.from.x) * progress,
        y: wall.from.y + (wall.to.y - wall.from.y) * progress,
        z: wall.from.z ?? wall.to.z ?? 0,
      };
      const screen = isoToScreen(point);
      const sprite = new PIXI.Sprite(textureFor(wall.asset));
      sprite.anchor.set(0.5, 1);
      sprite.width = wall.displayWidth ?? 132;
      sprite.scale.y = sprite.scale.x;
      sprite.position.set(screen.x, screen.y + 2);
      sprite.zIndex = isoDepth(point) - 0.5;
      scene.addChild(sprite);
    }
    return;
  }
  const from = isoToScreen(wall.from);
  const to = isoToScreen(wall.to);
  const height = wall.height + Math.max(wall.from.z ?? 0, wall.to.z ?? 0) * ELEVATION_HEIGHT;
  const graphic = new PIXI.Graphics();
  if (wall.kind === 'curb') {
    graphic.lineStyle(5, 0xc6c092, 0.72);
    graphic.moveTo(from.x, from.y - 2);
    graphic.lineTo(to.x, to.y - 2);
    graphic.zIndex = Math.max(isoDepth(wall.from), isoDepth(wall.to)) - 1;
    scene.addChild(graphic);
    return;
  }
  graphic.beginFill(wallPalette(wall), wall.kind === 'fence' ? 0.9 : 1);
  graphic.lineStyle(2, wall.kind === 'fence' ? 0xd7c98f : 0xd6cfb7, 0.55);
  graphic.drawPolygon([from.x, from.y, to.x, to.y, to.x, to.y - height, from.x, from.y - height]);
  graphic.endFill();
  graphic.zIndex = Math.max(isoDepth(wall.from), isoDepth(wall.to)) - 1;
  scene.addChild(graphic);

  if (wall.kind === 'fence') {
    const rail = new PIXI.Graphics();
    rail.lineStyle(4, 0xd7c98f, 0.85);
    rail.moveTo(from.x, from.y - height + 4);
    rail.lineTo(to.x, to.y - height + 4);
    rail.zIndex = graphic.zIndex + 0.1;
    scene.addChild(rail);
  }
}

export function renderBorders(scene: PIXI.Container, geometry: RoomGeometry, textureFor?: (url: string) => PIXI.Texture) {
  renderTerrainEdges(scene, geometry);
  geometry.walls.forEach((wall) => renderWall(scene, wall, textureFor));
}
