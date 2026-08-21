/**
 * Substantially adapted from Open Hotel Client's MIT-licensed Matrix.ts.
 * Retains the flat-array matrix, coordinate/index conversion, neighbor sets,
 * map/reduce traversal, cloning and legacy heightmap parsing. Types and error
 * handling were modernized for Human World's strict TypeScript build.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/engine/lib/util/Matrix.ts
 */
export type MatrixOffset = Readonly<{ x: number; y: number }>;

const LEGACY_HEIGHTS = 'x0123456789abcdefghijklmnopqrstuvwyz';

export class Matrix<T> {
  static readonly NEIGHBORS = {
    TOP_LEFT: { x: -1, y: -1 }, TOP: { x: 0, y: -1 }, TOP_RIGHT: { x: 1, y: -1 },
    RIGHT: { x: 1, y: 0 }, BOTTOM_RIGHT: { x: 1, y: 1 }, BOTTOM: { x: 0, y: 1 },
    BOTTOM_LEFT: { x: -1, y: 1 }, LEFT: { x: -1, y: 0 }, CENTER: { x: 0, y: 0 },
  } as const;
  static readonly NEIGHBORS_ALL: MatrixOffset[] = [
    Matrix.NEIGHBORS.TOP_LEFT, Matrix.NEIGHBORS.TOP, Matrix.NEIGHBORS.TOP_RIGHT,
    Matrix.NEIGHBORS.RIGHT, Matrix.NEIGHBORS.BOTTOM_RIGHT, Matrix.NEIGHBORS.BOTTOM,
    Matrix.NEIGHBORS.BOTTOM_LEFT, Matrix.NEIGHBORS.LEFT,
  ];
  static readonly NEIGHBORS_ADJACENT: MatrixOffset[] = [Matrix.NEIGHBORS.TOP, Matrix.NEIGHBORS.RIGHT, Matrix.NEIGHBORS.BOTTOM, Matrix.NEIGHBORS.LEFT];

  readonly data: T[];

  constructor(readonly width: number, readonly height = width, data?: T[]) {
    this.data = (data ?? new Array<T>(width * height)).slice(0, width * height);
    while (this.data.length < width * height) this.data.push(undefined as T);
  }

  getIndexOf(x: number, y: number) { return y * this.width + x; }
  getCoords(index: number) { return { x: index % this.width, y: Math.floor(index / this.width) }; }

  get(x: number, y: number, fallback?: T): T | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return fallback;
    return this.data[this.getIndexOf(x, y)] ?? fallback;
  }

  set(x: number, y: number, value: T) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw new RangeError(`Matrix coordinate ${x},${y} is outside ${this.width}x${this.height}`);
    this.data[this.getIndexOf(x, y)] = value;
    return this;
  }

  getRow(y: number) {
    if (y < 0 || y >= this.height) throw new RangeError(`Invalid matrix row ${y}`);
    return this.data.slice(y * this.width, (y + 1) * this.width);
  }

  getCol(x: number) {
    if (x < 0 || x >= this.width) throw new RangeError(`Invalid matrix column ${x}`);
    return Array.from({ length: this.height }, (_, y) => this.data[this.getIndexOf(x, y)]);
  }

  fill(value: T | ((current: T, x: number, y: number) => T)) {
    for (let index = 0; index < this.data.length; index += 1) {
      const { x, y } = this.getCoords(index);
      this.data[index] = typeof value === 'function' ? (value as (current: T, x: number, y: number) => T)(this.data[index], x, y) : value;
    }
    return this;
  }

  map<R>(callback: (value: T, x: number, y: number, matrix: Matrix<T>) => R) {
    return new Matrix<R>(this.width, this.height, this.data.map((value, index) => {
      const { x, y } = this.getCoords(index);
      return callback(value, x, y, this);
    }));
  }

  forEach(callback: (value: T, x: number, y: number, matrix: Matrix<T>) => void) {
    this.data.forEach((value, index) => {
      const { x, y } = this.getCoords(index);
      callback(value, x, y, this);
    });
  }

  reduce<R>(callback: (accumulator: R, value: T, x: number, y: number, matrix: Matrix<T>) => R, initial: R) {
    return this.data.reduce((accumulator, value, index) => {
      const { x, y } = this.getCoords(index);
      return callback(accumulator, value, x, y, this);
    }, initial);
  }

  neighborsOf(x: number, y: number, offsets: MatrixOffset[] = Matrix.NEIGHBORS_ALL) {
    return offsets.map((offset) => this.get(x + offset.x, y + offset.y));
  }

  *entries(): Generator<[[number, number], T]> {
    for (let y = 0; y < this.height; y += 1) for (let x = 0; x < this.width; x += 1) yield [[x, y], this.data[this.getIndexOf(x, y)]];
  }

  clone() { return new Matrix<T>(this.width, this.height, this.data); }

  static fromRows<T>(rows: T[][]) {
    if (rows.length === 0) return new Matrix<T>(0, 0, []);
    return new Matrix<T>(rows[0].length, rows.length, rows.flat());
  }

  static fromLegacyString(map: string) {
    const rows = map.trim().split(/\r?\n/).map((row) => [...row].map((character) => LEGACY_HEIGHTS.indexOf(character)));
    return Matrix.fromRows(rows);
  }
}
