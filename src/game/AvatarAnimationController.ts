export type AvatarDirection = 'south' | 'west' | 'north' | 'east';
export type AvatarMotion = 'idle' | 'walk' | 'wave' | 'sit';

const directionFromVector = (x: number, y: number, fallback: AvatarDirection): AvatarDirection => {
  if (Math.abs(x) < 0.0001 && Math.abs(y) < 0.0001) return fallback;
  if (Math.abs(x) > Math.abs(y) * 0.72) return x < 0 ? 'west' : 'east';
  return y < 0 ? 'north' : 'south';
};

/** Converts motion distance and facing changes into deterministic sprite-atlas frames. */
export class AvatarAnimationController {
  direction: AvatarDirection = 'south';
  motion: AvatarMotion = 'idle';
  frame = 0;
  private walkDistance = 0;
  private idleTime = 0;

  update(deltaMs: number, moved: number, screenDelta: { x: number; y: number }) {
    if (moved > 0.0001) {
      this.motion = 'walk';
      this.direction = directionFromVector(screenDelta.x, screenDelta.y, this.direction);
      this.walkDistance += moved;
      this.frame = Math.floor(this.walkDistance / 0.16) % 4;
      this.idleTime = 0;
    } else {
      this.motion = 'idle';
      this.frame = 0;
      this.idleTime += deltaMs;
    }
    return { direction: this.direction, motion: this.motion, frame: this.frame, idlePhase: this.idleTime / 900 };
  }
}
