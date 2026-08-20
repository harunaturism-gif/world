import * as PIXI from 'pixi.js';
import { isoToScreen, type IsoPoint } from './isometric';

export class CameraController {
  private scale = 1;
  private x = 0;
  private y = 0;

  layout(scene: PIXI.Container, screen: PIXI.Rectangle, focus: IsoPoint, immediate = false) {
    const compact = screen.width < 640;
    this.scale = compact
      ? Math.min(screen.width / 690, screen.height / 510, 0.78)
      : Math.min(screen.width / 1020, screen.height / 620, 1.12);
    const focusScreen = isoToScreen(focus);
    const baseX = screen.width / 2;
    const baseY = compact ? screen.height * 0.38 : screen.height * 0.43;
    const targetX = baseX - focusScreen.x * this.scale * 0.18;
    const targetY = baseY - focusScreen.y * this.scale * 0.13;
    const amount = immediate ? 1 : 0.08;
    this.x += (targetX - this.x) * amount;
    this.y += (targetY - this.y) * amount;
    scene.scale.set(this.scale);
    scene.position.set(this.x, this.y);
  }
}
