import type { AvatarAppearance, AvatarLayerSlot } from '../roomEngine';

/**
 * Adapted from Open Hotel Client's MIT-licensed AvatarStructure.ts.
 * Retains declarative body-part grouping, hidden-layer resolution, tinting and
 * deterministic layer order while using original local Human World part art.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/game/imager/avatar/AvatarStructure.ts
 */
export interface HumanWorldAvatarPart {
  slot: AvatarLayerSlot;
  asset: string;
  tint?: number;
  hiddenLayers?: AvatarLayerSlot[];
}

const layerOrder: AvatarLayerSlot[] = ['body', 'bottom', 'shoes', 'top', 'head', 'face', 'hair', 'accessory'];

export class AvatarStructure {
  private parts: HumanWorldAvatarPart[] = [];
  add(part: HumanWorldAvatarPart) { this.parts.push(part); return this; }
  build(renderWidth: number): AvatarAppearance {
    const hidden = new Set(this.parts.flatMap((part) => part.hiddenLayers ?? []));
    const layers = [...this.parts]
      .filter((part) => !hidden.has(part.slot))
      .sort((a, b) => layerOrder.indexOf(a.slot) - layerOrder.indexOf(b.slot))
      .map(({ slot, asset, tint }) => ({ slot, asset, tint }));
    return { frameColumns: 1, frameRows: 1, renderWidth, layers };
  }
}
