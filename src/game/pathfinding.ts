import type { IsoPoint } from './isometric';

const GRID_STEP = 0.5;
const MAX_VISITED_NODES = 8000;

interface GridPoint { x: number; y: number }
interface SearchNode extends GridPoint { g: number; f: number; parent?: string }

const keyOf = ({ x, y }: GridPoint) => `${x},${y}`;
const toGrid = (point: IsoPoint): GridPoint => ({ x: Math.round(point.x / GRID_STEP), y: Math.round(point.y / GRID_STEP) });
const toWorld = (point: GridPoint): IsoPoint => ({ x: point.x * GRID_STEP, y: point.y * GRID_STEP });

const directions: GridPoint[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

const heuristic = (a: GridPoint, b: GridPoint) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
};

function nearestWalkable(goal: GridPoint, isBlocked: (point: IsoPoint) => boolean): GridPoint | null {
  if (!isBlocked(toWorld(goal))) return goal;
  for (let radius = 1; radius <= 8; radius += 1) {
    const candidates: GridPoint[] = [];
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const candidate = { x: goal.x + dx, y: goal.y + dy };
        if (!isBlocked(toWorld(candidate))) candidates.push(candidate);
      }
    }
    if (candidates.length > 0) {
      return candidates.reduce((nearest, candidate) => heuristic(candidate, goal) < heuristic(nearest, goal) ? candidate : nearest);
    }
  }
  return null;
}
function simplify(path: IsoPoint[]) {
  if (path.length < 3) return path;
  const result = [path[0]];
  for (let index = 1; index < path.length - 1; index += 1) {
    const previous = result[result.length - 1];
    const current = path[index];
    const next = path[index + 1];
    const firstX = Math.sign(current.x - previous.x);
    const firstY = Math.sign(current.y - previous.y);
    const secondX = Math.sign(next.x - current.x);
    const secondY = Math.sign(next.y - current.y);
    if (firstX !== secondX || firstY !== secondY) result.push(current);
  }
  result.push(path[path.length - 1]);
  return result;
}

/** Lightweight A* over the room's hidden half-tile navigation grid. */
export function findPath(
  start: IsoPoint,
  requestedGoal: IsoPoint,
  isBlocked: (point: IsoPoint) => boolean,
  canTraverse: (from: IsoPoint, to: IsoPoint) => boolean = (_, to) => !isBlocked(to),
): IsoPoint[] {
  const startGrid = toGrid(start);
  const goalGrid = nearestWalkable(toGrid(requestedGoal), isBlocked);
  if (!goalGrid) return [];

  const startKey = keyOf(startGrid);
  const goalKey = keyOf(goalGrid);
  if (startKey === goalKey) return [toWorld(goalGrid)];

  const open = new Map<string, SearchNode>();
  const closed = new Set<string>();
  const nodes = new Map<string, SearchNode>();
  const first: SearchNode = { ...startGrid, g: 0, f: heuristic(startGrid, goalGrid) };
  open.set(startKey, first);
  nodes.set(startKey, first);

  let visited = 0;
  while (open.size > 0 && visited < MAX_VISITED_NODES) {
    visited += 1;
    let currentKey = '';
    let current: SearchNode | undefined;
    open.forEach((candidate, candidateKey) => {
      if (!current || candidate.f < current.f) {
        current = candidate;
        currentKey = candidateKey;
      }
    });
    if (!current) break;
    if (currentKey === goalKey) {
      const path: IsoPoint[] = [];
      let cursor: SearchNode | undefined = current;
      while (cursor) {
        path.unshift(toWorld(cursor));
        cursor = cursor.parent ? nodes.get(cursor.parent) : undefined;
      }
      path[0] = { ...start };
      return simplify(path);
    }

    open.delete(currentKey);
    closed.add(currentKey);
    for (const direction of directions) {
      const candidate = { x: current.x + direction.x, y: current.y + direction.y };
      const candidateKey = keyOf(candidate);
      if (closed.has(candidateKey) || !canTraverse(toWorld(current), toWorld(candidate))) continue;
      if (direction.x !== 0 && direction.y !== 0) {
        const horizontal = toWorld({ x: current.x + direction.x, y: current.y });
        const vertical = toWorld({ x: current.x, y: current.y + direction.y });
        if (isBlocked(horizontal) || isBlocked(vertical)) continue;
      }
      const g = current.g + (direction.x !== 0 && direction.y !== 0 ? Math.SQRT2 : 1);
      const existing = nodes.get(candidateKey);
      if (existing && g >= existing.g) continue;
      const node: SearchNode = { ...candidate, g, f: g + heuristic(candidate, goalGrid), parent: currentKey };
      nodes.set(candidateKey, node);
      open.set(candidateKey, node);
    }
  }
  return [];
}
