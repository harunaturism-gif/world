import { intersects, isoToScreen, type IsoPoint } from './isometric';
import type { RoomCellDefinition, RoomGeometryDefinition, RoomObjectDefinition, RoomWallDefinition } from './roomEngine';
import { OpenHotelRoomModel } from './openHotel/RoomModel';

const cellKey = (x: number, y: number) => `${x},${y}`;

function distanceToSegment(point: IsoPoint, wall: RoomWallDefinition) {
  const vx = wall.to.x - wall.from.x;
  const vy = wall.to.y - wall.from.y;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - wall.from.x) * vx + (point.y - wall.from.y) * vy) / lengthSquared));
  return Math.hypot(point.x - (wall.from.x + vx * t), point.y - (wall.from.y + vy * t));
}

export class RoomGeometry {
  private readonly cells = new Map<string, RoomCellDefinition>();
  readonly roomModel: OpenHotelRoomModel;

  constructor(readonly definition: RoomGeometryDefinition) {
    definition.cells.forEach((cell) => this.cells.set(cellKey(cell.x, cell.y), cell));
    this.roomModel = OpenHotelRoomModel.fromCells(definition.cells, definition.spawn);
  }

  get allCells() { return this.definition.cells; }
  get walls() { return this.definition.walls; }
  get spawn() { return this.definition.spawn; }

  cellAt(point: IsoPoint) {
    return this.roomModel.cellAt(point.x, point.y);
  }

  cellAtCoordinates(x: number, y: number) {
    return this.cells.get(cellKey(x, y));
  }

  elevationAt(point: IsoPoint) {
    const x0 = Math.floor(point.x);
    const y0 = Math.floor(point.y);
    const x1 = Math.ceil(point.x);
    const y1 = Math.ceil(point.y);
    const samples = [
      { cell: this.cellAtCoordinates(x0, y0), weight: (1 - (point.x - x0)) * (1 - (point.y - y0)) },
      { cell: this.cellAtCoordinates(x1, y0), weight: (point.x - x0) * (1 - (point.y - y0)) },
      { cell: this.cellAtCoordinates(x0, y1), weight: (1 - (point.x - x0)) * (point.y - y0) },
      { cell: this.cellAtCoordinates(x1, y1), weight: (point.x - x0) * (point.y - y0) },
    ].filter((sample) => sample.cell && sample.weight > 0);
    if (samples.length === 0) return this.cellAt(point)?.elevation ?? 0;
    const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0);
    return samples.reduce((sum, sample) => sum + sample.cell!.elevation * sample.weight, 0) / totalWeight;
  }

  worldPoint(point: IsoPoint): IsoPoint {
    return { x: point.x, y: point.y, z: this.elevationAt(point) };
  }

  isBlocked(point: IsoPoint, objects: RoomObjectDefinition[]) {
    const cell = this.cellAt(point);
    if (!cell?.walkable) return true;
    if (objects.some((object) => object.collision && intersects(point, object.collision, 0.16))) return true;
    return this.walls.some((wall) => wall.blocksMovement && distanceToSegment(point, wall) < (wall.thickness ?? 0.18) + 0.16);
  }

  canTraverse(from: IsoPoint, to: IsoPoint, objects: RoomObjectDefinition[]) {
    if (this.isBlocked(to, objects)) return false;
    return Math.abs(this.elevationAt(to) - this.elevationAt(from)) <= this.definition.maxStepHeight;
  }

  hasNeighbor(cell: RoomCellDefinition, dx: number, dy: number) {
    return this.cells.has(cellKey(cell.x + dx, cell.y + dy));
  }

  projectedFloorBounds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of this.allCells) {
      const screen = isoToScreen({ x: cell.x, y: cell.y, z: cell.elevation });
      minX = Math.min(minX, screen.x - 64);
      maxX = Math.max(maxX, screen.x + 64);
      minY = Math.min(minY, screen.y - 32);
      maxY = Math.max(maxY, screen.y + 44);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}
