/**
 * Adapted from Open Hotel Client's MIT-licensed AnimationManager.ts.
 * It retains normalized looping tracks and a single deterministic frame cursor,
 * but uses numeric frame tracks instead of legacy external figuredata JSON.
 * Source: https://github.com/open-hotel/open-hotel-client/blob/master/src/game/imager/avatar/animation/AnimationManager.ts
 */
const greatestCommonDivisor = (a: number, b: number): number => b === 0 ? a : greatestCommonDivisor(b, a % b);
const leastCommonMultiple = (a: number, b: number) => Math.abs(a * b) / greatestCommonDivisor(a, b);

export class AnimationTimeline {
  private tracks: number[][] = [];
  private frames: number[][] = [];
  private cursor = -1;
  private elapsed = 0;

  constructor(private readonly frameDurationMs = 115) {}

  add(track: number[]) {
    if (track.length > 0) this.tracks.push([...track]);
    return this;
  }

  buildFrames() {
    const frameCount = this.tracks.reduce((count, track) => count === 0 ? track.length : leastCommonMultiple(count, track.length), 0);
    this.frames = Array.from({ length: frameCount }, (_, frame) => this.tracks.map((track) => track[frame % track.length]));
    this.cursor = -1;
    return this;
  }

  reset() { this.cursor = -1; this.elapsed = 0; }

  update(deltaMs: number) {
    if (this.frames.length === 0) return [];
    this.elapsed += deltaMs;
    while (this.elapsed >= this.frameDurationMs) {
      this.elapsed -= this.frameDurationMs;
      this.cursor = (this.cursor + 1) % this.frames.length;
    }
    if (this.cursor < 0) this.cursor = 0;
    return this.frames[this.cursor];
  }
}
