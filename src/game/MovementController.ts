import type { IsoPoint } from './isometric';

export interface MovementFrame {
  moved: number;
  moving: boolean;
  arrived: boolean;
  screenDelta: IsoPoint;
}
export class MovementController {
  position: IsoPoint;
  destination: IsoPoint;
  private waypoints: IsoPoint[] = [];

  constructor(position: IsoPoint, readonly speed: number) {
    this.position = { ...position };
    this.destination = { ...position };
  }

  get moving() { return this.waypoints.length > 0; }

  setPath(path: IsoPoint[]) {
    const firstIsCurrent = path[0] && Math.hypot(path[0].x - this.position.x, path[0].y - this.position.y) < 0.05;
    this.waypoints = (firstIsCurrent ? path.slice(1) : path).map((point) => ({ ...point }));
    this.destination = this.waypoints.length > 0 ? { ...this.waypoints[this.waypoints.length - 1] } : { ...this.position };
  }

  stop() {
    this.waypoints = [];
    this.destination = { ...this.position };
  }

  moveDirect(delta: IsoPoint, isBlocked: (point: IsoPoint) => boolean): MovementFrame {
    this.stop();
    const previous = { ...this.position };
    const full = { x: previous.x + delta.x, y: previous.y + delta.y };
    const slideX = { x: full.x, y: previous.y };
    const slideY = { x: previous.x, y: full.y };
    if (!isBlocked(full)) this.position = full;
    else if (!isBlocked(slideX)) this.position = slideX;
    else if (!isBlocked(slideY)) this.position = slideY;
    return this.frameFrom(previous, false);
  }

  update(deltaSeconds: number, isBlocked: (point: IsoPoint) => boolean): MovementFrame {
    const previous = { ...this.position };
    const waypoint = this.waypoints[0];
    if (!waypoint) return this.frameFrom(previous, true);
    const dx = waypoint.x - this.position.x;
    const dy = waypoint.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.025) {
      this.position = { ...waypoint };
      this.waypoints.shift();
      return this.update(deltaSeconds, isBlocked);
    }
    const step = Math.min(this.speed * deltaSeconds, distance);
    const next = { x: this.position.x + dx / distance * step, y: this.position.y + dy / distance * step };
    if (isBlocked(next)) this.stop();
    else this.position = next;
    if (Math.hypot(waypoint.x - this.position.x, waypoint.y - this.position.y) < 0.025) {
      this.position = { ...waypoint };
      this.waypoints.shift();
    }
    return this.frameFrom(previous, this.waypoints.length === 0);
  }

  private frameFrom(previous: IsoPoint, arrived: boolean): MovementFrame {
    const dx = this.position.x - previous.x;
    const dy = this.position.y - previous.y;
    const moved = Math.hypot(dx, dy);
    return { moved, moving: moved > 0.0001, arrived: arrived && !this.moving, screenDelta: { x: dx - dy, y: dx + dy } };
  }
}
