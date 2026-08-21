import type { AvatarDirection, AvatarMotion } from '../AvatarAnimationController';
import type { IsoPoint } from '../isometric';
import { AnimationTimeline } from './AnimationTimeline';
import { Vector3 } from './Vector3';

export interface RoomUserFrame {
  moved: number;
  moving: boolean;
  arrived: boolean;
  screenDelta: IsoPoint;
  direction: AvatarDirection;
  motion: AvatarMotion;
  animationFrame: number;
  waiting: boolean;
}

const directionFromVector = (x: number, y: number, fallback: AvatarDirection): AvatarDirection => {
  if (Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001) return fallback;
  if (Math.abs(x) > Math.abs(y) * 0.72) return x < 0 ? 'west' : 'east';
  return y < 0 ? 'north' : 'south';
};

/**
 * Substantial PixiJS 7/TypeScript adaptation of Open Hotel's MIT RoomUser.ts.
 * The user owns world coordinates, room membership, target/path, direction,
 * movement, wait/retry state, animation state and depth-relevant base position.
 * Tween teleports were replaced with waypoint simulation suitable for A*.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/game/room/users/RoomUser.ts
 */
export class RoomUser {
  readonly iso: Vector3;
  readonly animation = new AnimationTimeline(110).add([0, 1, 2, 3]).buildFrames();
  direction: AvatarDirection = 'south';
  motion: AvatarMotion = 'idle';
  destination: Vector3;
  roomId: string;
  private waypoints: Vector3[] = [];
  private blockedSince = 0;
  retryAt = 0;
  lastRequestedTarget?: Vector3;

  constructor(readonly id: string, roomId: string, position: IsoPoint, readonly speed: number) {
    this.roomId = roomId;
    this.iso = Vector3.from(position);
    this.destination = this.iso.clone();
  }

  get moving() { return this.waypoints.length > 0; }
  get waiting() { return this.blockedSince > 0; }

  setPath(path: IsoPoint[], requestedTarget?: IsoPoint) {
    const firstIsCurrent = path[0] && Math.hypot(path[0].x - this.iso.x, path[0].y - this.iso.y) < 0.05;
    this.waypoints = (firstIsCurrent ? path.slice(1) : path).map((point) => Vector3.from(point));
    this.destination = this.waypoints[this.waypoints.length - 1]?.clone() ?? this.iso.clone();
    this.lastRequestedTarget = requestedTarget ? Vector3.from(requestedTarget) : this.destination.clone();
    this.blockedSince = 0;
  }

  stop(clearTarget = false) {
    this.waypoints = [];
    this.destination = this.iso.clone();
    this.blockedSince = 0;
    if (clearTarget) this.lastRequestedTarget = undefined;
  }

  moveDirect(delta: IsoPoint, blocked: (point: IsoPoint) => boolean, deltaMs: number): RoomUserFrame {
    this.stop(true);
    const previous = this.iso.clone();
    const full = { x: previous.x + delta.x, y: previous.y + delta.y };
    const slideX = { x: full.x, y: previous.y };
    const slideY = { x: previous.x, y: full.y };
    if (!blocked(full)) this.iso.set(full.x, full.y);
    else if (!blocked(slideX)) this.iso.set(slideX.x, slideX.y);
    else if (!blocked(slideY)) this.iso.set(slideY.x, slideY.y);
    return this.frame(previous, deltaMs, false, false);
  }

  tick(deltaSeconds: number, now: number, staticBlocked: (point: IsoPoint) => boolean, dynamicBlocked: (point: IsoPoint) => boolean): RoomUserFrame {
    const previous = this.iso.clone();
    const waypoint = this.waypoints[0];
    if (!waypoint) return this.frame(previous, deltaSeconds * 1000, true, false);
    const dx = waypoint.x - this.iso.x;
    const dy = waypoint.y - this.iso.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.025) {
      this.iso.set(waypoint.x, waypoint.y, waypoint.z);
      this.waypoints.shift();
      return this.tick(deltaSeconds, now, staticBlocked, dynamicBlocked);
    }
    const step = Math.min(this.speed * deltaSeconds, distance);
    const next = { x: this.iso.x + dx / distance * step, y: this.iso.y + dy / distance * step };
    if (staticBlocked(next)) {
      if (this.blockedSince === 0) {
        this.blockedSince = now;
        this.retryAt = now + 100;
      }
      return this.frame(previous, deltaSeconds * 1000, false, true);
    }
    if (dynamicBlocked(next)) {
      if (this.blockedSince === 0) {
        this.blockedSince = now;
        this.retryAt = now + 150;
      }
      return this.frame(previous, deltaSeconds * 1000, false, true);
    }
    this.blockedSince = 0;
    this.iso.set(next.x, next.y);
    if (Math.hypot(waypoint.x - this.iso.x, waypoint.y - this.iso.y) < 0.025) {
      this.iso.set(waypoint.x, waypoint.y, waypoint.z);
      this.waypoints.shift();
    }
    return this.frame(previous, deltaSeconds * 1000, this.waypoints.length === 0, false);
  }

  private frame(previous: Vector3, deltaMs: number, arrived: boolean, waiting: boolean): RoomUserFrame {
    const dx = this.iso.x - previous.x;
    const dy = this.iso.y - previous.y;
    const moved = Math.hypot(dx, dy);
    const screenDelta = { x: dx - dy, y: dx + dy };
    if (moved > 0.0001) {
      this.motion = 'walk';
      this.direction = directionFromVector(screenDelta.x, screenDelta.y, this.direction);
    } else this.motion = 'idle';
    const timelineFrame = this.motion === 'walk' ? this.animation.update(deltaMs)[0] ?? 0 : 0;
    return { moved, moving: moved > 0.0001, arrived: arrived && !this.moving, screenDelta, direction: this.direction, motion: this.motion, animationFrame: timelineFrame, waiting };
  }
}
