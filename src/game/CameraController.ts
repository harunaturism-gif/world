import * as PIXI from 'pixi.js';
import { isoToScreen, type IsoPoint } from './isometric';

interface Insets { top: number; right: number; bottom: number; left: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Large-room camera: dead-zone follow, bounded pan and device-independent zoom. */
export class CameraController {
  private scale = 1;
  private zoom = 1;
  private x = 0;
  private y = 0;
  private bounds = new PIXI.Rectangle(-600, -350, 1200, 700);
  private manualPanX = 0;
  private manualPanY = 0;

  configure(bounds: PIXI.Rectangle, initialFocus: IsoPoint) { this.bounds = bounds.clone(); void initialFocus; }
  zoomBy(amount: number) { this.zoom = clamp(this.zoom + amount, 0.78, 1.22); }
  panBy(x: number, y: number) { this.manualPanX += x; this.manualPanY += y; }
  recenter() { this.manualPanX = 0; this.manualPanY = 0; }

  private insets(screen: PIXI.Rectangle): Insets {
    return screen.width < 640
      ? { top: 62, right: 8, bottom: 76, left: 8 }
      : { top: 64, right: screen.width > 980 ? 88 : 18, bottom: 80, left: 14 };
  }

  private clampOrigin(value: number, boundsStart: number, boundsSize: number, viewportStart: number, viewportSize: number, scale: number) {
    const scaledSize = boundsSize * scale;
    if (scaledSize <= viewportSize) return viewportStart + (viewportSize - scaledSize) / 2 - boundsStart * scale;
    return clamp(value, viewportStart + viewportSize - (boundsStart + boundsSize) * scale, viewportStart - boundsStart * scale);
  }

  layout(scene: PIXI.Container, screen: PIXI.Rectangle, focus: IsoPoint, moving: boolean, immediate = false) {
    const insets = this.insets(screen);
    const viewportWidth = screen.width - insets.left - insets.right;
    const viewportHeight = screen.height - insets.top - insets.bottom;
    const targetScale = (screen.width < 640 ? 0.76 : 0.86) * this.zoom;
    const amount = immediate ? 1 : 0.1;
    this.scale += (targetScale - this.scale) * amount;

    const focusScreen = isoToScreen(focus);
    const projectedX = focusScreen.x * this.scale + this.x;
    const projectedY = focusScreen.y * this.scale + this.y;
    const deadLeft = insets.left + viewportWidth * 0.34;
    const deadRight = insets.left + viewportWidth * 0.66;
    const mobile = screen.width < 640;
    const deadTop = insets.top + viewportHeight * (mobile ? 0.24 : 0.3);
    const deadBottom = insets.top + viewportHeight * (mobile ? 0.82 : 0.72);
    let targetX = this.x;
    let targetY = this.y;

    if (immediate && this.x === 0 && this.y === 0) {
      targetX = insets.left + viewportWidth / 2 - focusScreen.x * this.scale;
      targetY = insets.top + viewportHeight * (mobile ? 0.74 : 0.64) - focusScreen.y * this.scale;
    } else if (moving || Math.abs(this.manualPanX) < 1 || Math.abs(this.manualPanY) < 1) {
      targetX += projectedX < deadLeft ? deadLeft - projectedX : projectedX > deadRight ? deadRight - projectedX : 0;
      targetY += projectedY < deadTop ? deadTop - projectedY : projectedY > deadBottom ? deadBottom - projectedY : 0;
    }

    targetX += this.manualPanX;
    targetY += this.manualPanY;
    this.manualPanX *= 0.84;
    this.manualPanY *= 0.84;
    targetX = this.clampOrigin(targetX, this.bounds.x, this.bounds.width, insets.left, viewportWidth, this.scale);
    targetY = this.clampOrigin(targetY, this.bounds.y, this.bounds.height, insets.top, viewportHeight, this.scale);
    this.x += (targetX - this.x) * amount;
    this.y += (targetY - this.y) * amount;
    scene.scale.set(this.scale);
    scene.position.set(this.x, this.y);
  }
}
