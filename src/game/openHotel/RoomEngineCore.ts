import type { IsoPoint } from '../isometric';
import { findPath } from '../pathfinding';
import { RoomUser, type RoomUserFrame } from './RoomUser';

interface SimulationGeometry {
  staticBlocked(point: IsoPoint): boolean;
  canTraverse(from: IsoPoint, to: IsoPoint): boolean;
  elevationAt(point: IsoPoint): number;
}

/**
 * Adapted from Open Hotel Client's MIT Room.engine.ts.
 * Retains one room-owned user dictionary, central ticking and coordinate-based
 * depth. Human World adds A*, soft dynamic occupancy and delayed rerouting.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/game/room/Room.engine.ts
 */
export class RoomEngineCore {
  readonly users = new Map<string, RoomUser>();
  constructor(readonly roomId: string, private readonly geometry: SimulationGeometry) {}

  addUser(id: string, position: IsoPoint, speed: number) {
    const user = new RoomUser(id, this.roomId, { ...position, z: this.geometry.elevationAt(position) }, speed);
    this.users.set(id, user);
    return user;
  }

  removeUser(id: string) { this.users.delete(id); }

  calcZIndex(point: IsoPoint, priority = 1) {
    return ((point.x + point.y) * 100 + (point.z ?? 0) * 160) * priority;
  }

  isDynamicallyOccupied(point: IsoPoint, exceptId: string, radius = 0.3) {
    for (const [id, user] of this.users) {
      if (id === exceptId) continue;
      if (Math.hypot(user.iso.x - point.x, user.iso.y - point.y) < radius) return true;
    }
    return false;
  }

  routeUser(id: string, requestedTarget: IsoPoint, avoidDynamic = true) {
    const user = this.users.get(id);
    if (!user) return false;
    const blocked = (point: IsoPoint) => this.geometry.staticBlocked(point) || (avoidDynamic && this.isDynamicallyOccupied(point, id, 0.36));
    let path = findPath(user.iso, requestedTarget, blocked, (from, to) => !blocked(to) && this.geometry.canTraverse(from, to));
    if (path.length === 0 && avoidDynamic) {
      path = findPath(user.iso, requestedTarget, (point) => this.geometry.staticBlocked(point), (from, to) => this.geometry.canTraverse(from, to));
    }
    user.setPath(path, requestedTarget);
    return path.length > 0;
  }

  moveUserDirect(id: string, delta: IsoPoint, deltaMs: number) {
    const user = this.users.get(id);
    if (!user) return undefined;
    return user.moveDirect(
      delta,
      (from, to) => this.geometry.canTraverse(from, to) && !this.isDynamicallyOccupied(to, id, 0.27),
      (point) => this.geometry.elevationAt(point),
      deltaMs,
    );
  }

  tickUser(id: string, deltaSeconds: number, now: number): RoomUserFrame | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    if (user.waiting && now >= user.retryAt && user.lastRequestedTarget) this.routeUser(id, user.lastRequestedTarget, true);
    return user.tick(
      deltaSeconds,
      now,
      (point) => this.geometry.staticBlocked(point),
      (point) => this.isDynamicallyOccupied(point, id),
      (point) => this.geometry.elevationAt(point),
    );
  }
}
