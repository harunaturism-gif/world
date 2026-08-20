export interface IsoPoint { x: number; y: number; z?: number; }
export type CollisionShape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number };

export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 64;
export const ELEVATION_HEIGHT = 32;

export function isoToScreen(point: IsoPoint): IsoPoint {
  return { x: (point.x - point.y) * TILE_WIDTH / 2, y: (point.x + point.y) * TILE_HEIGHT / 2 - (point.z ?? 0) * ELEVATION_HEIGHT };
}

export function screenToIso(point: IsoPoint, elevation = 0): IsoPoint {
  const y = point.y + elevation * ELEVATION_HEIGHT;
  return { x: point.x / TILE_WIDTH + y / TILE_HEIGHT, y: y / TILE_HEIGHT - point.x / TILE_WIDTH, z: elevation };
}

export function isoDepth(point: IsoPoint) {
  return (point.x + point.y) * TILE_HEIGHT / 2 + (point.z ?? 0) * TILE_HEIGHT;
}

export function intersects(point: IsoPoint, shape: CollisionShape, padding = .18): boolean {
  if (shape.kind === 'circle') return Math.hypot(point.x - shape.x, point.y - shape.y) < shape.radius + padding;
  return Math.abs(point.x - shape.x) < shape.width / 2 + padding && Math.abs(point.y - shape.y) < shape.height / 2 + padding;
}
