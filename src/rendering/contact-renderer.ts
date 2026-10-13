import { Container, Graphics } from 'pixi.js';
import type { HandColliderSet } from '../physics/hand-colliders';

export class ContactRenderer {
  public container: Container;
  private graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public render(colliderSets: HandColliderSet[]): void {
    this.graphics.clear();

    for (const set of colliderSets) {
      const isFist = set.pose === 'Fist';
      const isPinch = set.pose === 'Pinch';
      const isPointing = set.pose === 'Pointing';

      // 1. Dessiner les points de contact des doigts
      for (const circle of set.circles) {
        if (circle.tag === 'fingertip') {
          let ringColor = 0x38bdf8;
          let ringAlpha = 0.4;

          if (isPointing) {
            ringColor = 0xf59e0b; // Ambre énergique pour l'index pointé
            ringAlpha = 0.7;
          } else if (isPinch) {
            ringColor = 0x10b981; // Vert émeraude pour le pincement
            ringAlpha = 0.6;
          }

          // Halo externe
          this.graphics.circle(circle.center.x, circle.center.y, circle.radius + 6).stroke({
            width: 2,
            color: ringColor,
            alpha: ringAlpha,
          });

          // Cœur lumineux
          this.graphics.circle(circle.center.x, circle.center.y, circle.radius).fill({
            color: ringColor,
            alpha: 0.25,
          });
        } else if (circle.tag === 'palm') {
          const palmColor = isFist ? 0xef4444 : 0x6366f1;
          const palmAlpha = isFist ? 0.35 : 0.15;

          // Zone de contact de la paume
          this.graphics.circle(circle.center.x, circle.center.y, circle.radius).fill({
            color: palmColor,
            alpha: palmAlpha,
          });

          this.graphics.circle(circle.center.x, circle.center.y, circle.radius).stroke({
            width: 1.5,
            color: palmColor,
            alpha: 0.5,
          });
        }
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
