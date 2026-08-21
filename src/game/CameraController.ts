import * as PIXI from 'pixi.js';
import { isoToScreen, type IsoPoint } from './isometric';

type CameraMode = 'fit' | 'follow';

interface Insets { top: number; right: number; bottom: number; left: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class CameraController {
  private scale = 1;
  private x = 0;
  private y = 0;
  private bounds = new PIXI.Rectangle(-600, -350, 1200, 700);
  private initialFocus: IsoPoint = { x: 0, y: 0 };
  private mode: CameraMode = 'fit';

  configure(bounds: PIXI.Rectangle, initialFocus: IsoPoint) {
    this.bounds = bounds.clone();
    this.initialFocus = { ...initialFocus };
    this.mode = 'fit';
  }

  private insets(screen: PIXI.Rectangle): Insets {
    const compact = screen.width < 640;
    return compact
      ? { top: 62, right: 8, bottom: 76, left: 8 }
      : { top: 64, right: screen.width > 980 ? 88 : 18, bottom: 80, left: 14 };
  }

  private targetScale(screen: PIXI.Rectangle, insets: Insets) {
    const usableWidth = screen.width - insets.left - insets.right;
    const usableHeight = screen.height - insets.top - insets.bottom;
    const widthFit = usableWidth / this.bounds.width;
    const heightFit = usableHeight / this.bounds.height;
    if (screen.width < 640) return clamp(heightFit * 1.2, 1.02, 1.22);
    return clamp(Math.min(widthFit, heightFit) * 1.12, 0.94, 1.18);
  }

  private clampOrigin(value: number, boundsStart: number, boundsSize: number, viewportStart: number, viewportSize: number, scale: number) {
    const scaledSize = boundsSize * scale;
    if (scaledSize <= viewportSize) return viewportStart + (viewportSize - scaledSize) / 2 - boundsStart * scale;
    const minimum = viewportStart + viewportSize - (boundsStart + boundsSize) * scale;
    const maximum = viewportStart - boundsStart * scale;
    return clamp(value, minimum, maximum);
  }

  layout(scene: PIXI.Container, screen: PIXI.Rectangle, focus: IsoPoint, moving: boolean, immediate = false) {
    const insets = this.insets(screen);
    const viewportWidth = screen.width - insets.left - insets.right;
    const viewportHeight = screen.height - insets.top - insets.bottom;
    const targetScale = this.targetScale(screen, insets);
    const focusDistance = Math.hypot(focus.x - this.initialFocus.x, focus.y - this.initialFocus.y);
    if (moving && focusDistance > 0.7) this.mode = 'follow';

    const amount = immediate ? 1 : 0.085;
    this.scale += (targetScale - this.scale) * amount;
    let targetX = insets.left + viewportWidth / 2 - (this.bounds.x + this.bounds.width / 2) * this.scale;
    let targetY = insets.top + viewportHeight / 2 - (this.bounds.y + this.bounds.height / 2) * this.scale;

    if (screen.width < 640 && this.mode === 'fit') {
      const focusScreen = isoToScreen(focus);
      targetX = insets.left + viewportWidth / 2 - focusScreen.x * this.scale;
      targetY = insets.top + viewportHeight * 0.66 - focusScreen.y * this.scale;
    }

    if (this.mode === 'follow') {
      const focusScreen = isoToScreen(focus);
      const projectedX = focusScreen.x * this.scale + this.x;
      const projectedY = focusScreen.y * this.scale + this.y;
      const deadLeft = insets.left + viewportWidth * 0.3;
      const deadRight = insets.left + viewportWidth * 0.7;
      const deadTop = insets.top + viewportHeight * 0.28;
      const deadBottom = insets.top + viewportHeight * 0.7;
      targetX = this.x + (projectedX < deadLeft ? deadLeft - projectedX : projectedX > deadRight ? deadRight - projectedX : 0);
      targetY = this.y + (projectedY < deadTop ? deadTop - projectedY : projectedY > deadBottom ? deadBottom - projectedY : 0);
    }

    targetX = this.clampOrigin(targetX, this.bounds.x, this.bounds.width, insets.left, viewportWidth, this.scale);
    targetY = this.clampOrigin(targetY, this.bounds.y, this.bounds.height, insets.top, viewportHeight, this.scale);
    this.x += (targetX - this.x) * amount;
    this.y += (targetY - this.y) * amount;
    scene.scale.set(this.scale);
    scene.position.set(this.x, this.y);
  }
}
