import type { RoomCellDefinition } from '../roomEngine';
import { Matrix } from './Matrix';

/**
 * Room-owned heightmap model ported from Open Hotel's Room.model.ts and
 * room/types/room.model.ts. Zero is a hole; positive values are floor levels.
 * Human World adds coordinate offsets and material lookup for irregular maps.
 */
export class OpenHotelRoomModel {
  private readonly cells = new Map<string, RoomCellDefinition>();

  constructor(
    readonly heightmap: Matrix<number>,
    readonly originX: number,
    readonly originY: number,
    readonly spawn: { x: number; y: number },
    cells: RoomCellDefinition[],
  ) {
    cells.forEach((cell) => this.cells.set(this.key(cell.x, cell.y), cell));
  }

  static fromCells(cells: RoomCellDefinition[], spawn: { x: number; y: number }) {
    const minX = Math.min(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const heightmap = new Matrix<number>(maxX - minX + 1, maxY - minY + 1).fill(0);
    cells.forEach((cell) => heightmap.set(cell.x - minX, cell.y - minY, cell.walkable ? Math.round(cell.elevation * 4) + 1 : 0));
    return new OpenHotelRoomModel(heightmap, minX, minY, spawn, cells);
  }

  private key(x: number, y: number) { return `${x},${y}`; }
  toMatrix(x: number, y: number) { return { x: Math.round(x) - this.originX, y: Math.round(y) - this.originY }; }
  toWorld(x: number, y: number) { return { x: x + this.originX, y: y + this.originY }; }
  cellAt(x: number, y: number) { return this.cells.get(this.key(Math.round(x), Math.round(y))); }
  heightAt(x: number, y: number) { return this.cellAt(x, y)?.elevation ?? 0; }
  isValidTile(x: number, y: number) {
    const matrix = this.toMatrix(x, y);
    return (this.heightmap.get(matrix.x, matrix.y, 0) ?? 0) > 0;
  }
  neighborsOf(x: number, y: number) {
    const matrix = this.toMatrix(x, y);
    return this.heightmap.neighborsOf(matrix.x, matrix.y);
  }
}
