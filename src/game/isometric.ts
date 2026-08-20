export interface IsoPoint { x: number; y: number; }
export type CollisionShape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number };

export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 64;

export function isoToScreen(point: IsoPoint): IsoPoint {
  return { x: (point.x - point.y) * TILE_WIDTH / 2, y: (point.x + point.y) * TILE_HEIGHT / 2 };
}

export function screenToIso(point: IsoPoint): IsoPoint {
  return { x: point.x / TILE_WIDTH + point.y / TILE_HEIGHT, y: point.y / TILE_HEIGHT - point.x / TILE_WIDTH };
}

export function intersects(point: IsoPoint, shape: CollisionShape, padding = .18): boolean {
  if (shape.kind === 'circle') return Math.hypot(point.x - shape.x, point.y - shape.y) < shape.radius + padding;
  return Math.abs(point.x - shape.x) < shape.width / 2 + padding && Math.abs(point.y - shape.y) < shape.height / 2 + padding;
}
