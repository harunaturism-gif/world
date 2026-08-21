import { IsometricUtils } from './IsometricUtils';

/**
 * Port of Open Hotel Client's MIT-licensed Vector3 value object.
 * Pixi v4 Point coupling was removed; Human World returns plain screen points.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/engine/isometric/Vector3.ts
 */
export class Vector3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  static from(point: { x: number; y: number; z?: number } | [number, number, number], copy = true) {
    if (point instanceof Vector3) return copy ? point.clone() : point;
    return Array.isArray(point) ? new Vector3(point[0], point[1], point[2]) : new Vector3(point.x, point.y, point.z ?? 0);
  }
  add(point: { x: number; y: number; z?: number }) { return new Vector3(this.x + point.x, this.y + point.y, this.z + (point.z ?? 0)); }
  scale(point: { x: number; y: number; z?: number }) { return new Vector3(this.x * point.x, this.y * point.y, this.z * (point.z ?? 1)); }
  set(x: number, y: number, z = this.z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copyTo(point: { x: number; y: number; z?: number }) { point.x = this.x; point.y = this.y; point.z = this.z; return point; }
  toScreen() { return IsometricUtils.cartToIso(this.x, this.y, this.z); }
  equal(point: { x: number; y: number; z?: number }) { return this.x === point.x && this.y === point.y && this.z === (point.z ?? 0); }
}
