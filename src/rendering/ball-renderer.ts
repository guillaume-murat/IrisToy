import { Container, Graphics } from 'pixi.js';
import type { Ball } from '../game/ball';

export class BallRenderer {
  public container: Container;
  private graphics: Graphics;
  private squashFactor: number = 1.0;
  private squashAngle: number = 0;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public triggerBounceEffect(angle: number = 0): void {
    this.squashFactor = 0.72; // Écrasement à l'impact
    this.squashAngle = angle;
  }

  public update(ball: Ball, dt: number): void {
    this.graphics.clear();
    if (!ball.isAlive) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;

    // Récupération progressive du squash & stretch vers 1.0
    if (this.squashFactor < 1.0) {
      this.squashFactor = Math.min(1.0, this.squashFactor + dt * 3.5);
    }

    const r = ball.radius;
    const sx = this.squashFactor;
    const sy = 2.0 - this.squashFactor; // Préservation approximative du volume

    this.container.position.set(ball.position.x, ball.position.y);
    this.container.rotation = this.squashAngle;
    this.container.scale.set(sx, sy);

    // Halo lumineux externe (Glow)
    this.graphics.circle(0, 0, r + 6).fill({
      color: 0x38bdf8,
      alpha: 0.25,
    });

    // Corps principal du ballon (Dégradé visuel avec cercles imbriqués)
    this.graphics.circle(0, 0, r).fill({
      color: 0x0284c7,
      alpha: 0.95,
    });

    this.graphics.circle(-r * 0.2, -r * 0.2, r * 0.7).fill({
      color: 0x38bdf8,
      alpha: 0.9,
    });

    // Reflet de lumière spéculaire
    this.graphics.ellipse(-r * 0.35, -r * 0.35, r * 0.3, r * 0.18).fill({
      color: 0xffffff,
      alpha: 0.6,
    });

    // Contour net
    this.graphics.circle(0, 0, r).stroke({
      width: 2.5,
      color: 0xffffff,
      alpha: 0.85,
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
