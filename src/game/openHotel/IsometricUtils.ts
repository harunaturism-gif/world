import { WORLD_SCALE } from '../worldScale';

/**
 * Port of Open Hotel Client's MIT-licensed Cartesian/isometric transforms.
 * The normalized Open Hotel equations are retained and parameterized by the
 * Human World 96x48 scale instead of relying on 32-pixel legacy coordinates.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/engine/isometric/IsometricUtils.ts
 */
export class IsometricUtils {
  static cartToIso(x: number, y: number, z = 0) {
    return { x: (x - y) * WORLD_SCALE.tileWidth / 2, y: (x + y) * WORLD_SCALE.tileHeight / 2 - z * WORLD_SCALE.elevationHeight };
  }
  static isoToCart(isoX: number, isoY: number, isoZ = 0) {
    const elevatedY = isoY + isoZ * WORLD_SCALE.elevationHeight;
    return { x: isoX / WORLD_SCALE.tileWidth + elevatedY / WORLD_SCALE.tileHeight, y: elevatedY / WORLD_SCALE.tileHeight - isoX / WORLD_SCALE.tileWidth, z: isoZ };
  }
}
