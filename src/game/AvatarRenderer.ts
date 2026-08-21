import * as PIXI from 'pixi.js';
import type { AvatarDirection } from './AvatarAnimationController';
import type { AvatarAppearance, AvatarLayerSlot } from './roomEngine';

const directionRows: Record<AvatarDirection, number> = { south: 0, west: 1, north: 2, east: 3 };
const textureCache = new WeakMap<PIXI.BaseTexture, PIXI.Texture[][]>();

function sliceAtlas(texture: PIXI.Texture, columns: number, rows: number) {
  const cached = textureCache.get(texture.baseTexture);
  if (cached) return cached;
  const frameWidth = texture.baseTexture.width / columns;
  const frameHeight = texture.baseTexture.height / rows;
  const frames = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => new PIXI.Texture(
    texture.baseTexture,
    new PIXI.Rectangle(column * frameWidth, row * frameHeight, frameWidth, frameHeight),
  )));
  textureCache.set(texture.baseTexture, frames);
  return frames;
}

export interface AvatarTextureResolver { (url: string): PIXI.Texture }

/** Layer-aware sprite renderer. The first collection uses a baked base layer for frame coherence; future part atlases can occupy every supported slot. */
export class AvatarRenderer extends PIXI.Container {
  private readonly frameSets: { slot: AvatarLayerSlot; sprite: PIXI.Sprite; frames: PIXI.Texture[][] }[] = [];

  constructor(appearance: AvatarAppearance, resolveTexture: AvatarTextureResolver) {
    super();
    for (const layer of appearance.layers) {
      const texture = resolveTexture(layer.asset);
      const frames = sliceAtlas(texture, appearance.frameColumns, appearance.frameRows);
      const sprite = new PIXI.Sprite(frames[0]?.[0] ?? PIXI.Texture.EMPTY);
      sprite.anchor.set(0.5, 1);
      sprite.width = appearance.renderWidth;
      sprite.scale.y = sprite.scale.x;
      if (layer.tint !== undefined) sprite.tint = layer.tint;
      sprite.alpha = layer.alpha ?? 1;
      this.addChild(sprite);
      this.frameSets.push({ slot: layer.slot, sprite, frames });
    }
    this.setFrame('south', 0);
  }

  setFrame(direction: AvatarDirection, frame: number) {
    const row = directionRows[direction];
    for (const layer of this.frameSets) {
      const rowFrames = layer.frames[row] ?? layer.frames[0];
      layer.sprite.texture = rowFrames?.[frame % rowFrames.length] ?? PIXI.Texture.EMPTY;
    }
  }
}
