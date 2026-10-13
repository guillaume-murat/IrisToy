import { Container, Graphics } from 'pixi.js';
import type { DetectedHand } from '../types/tracking';
import { HAND_CONNECTIONS, mapLandmarkToScreen, type ViewportMappingOptions } from '../tracking/landmark-mapper';

export class SkeletonRenderer {
  public container: Container;
  private graphics: Graphics;
  public visible: boolean = true;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      this.graphics.clear();
    }
  }

  public render(
    hands: DetectedHand[],
    screenWidth: number,
    screenHeight: number,
    mappingOptions: boolean | ViewportMappingOptions = true
  ): void {
    this.graphics.clear();
    if (!this.visible || hands.length === 0) {
      return;
    }

    const mappingOpts: ViewportMappingOptions =
      typeof mappingOptions === 'boolean' ? { mirrored: mappingOptions } : mappingOptions;

    for (const hand of hands) {
      const isLeft = hand.handedness === 'Left';
      const boneColor = isLeft ? 0x38bdf8 : 0xc084fc;
      const jointColor = 0xffffff;

      const screenPoints = hand.landmarks.map((l) =>
        mapLandmarkToScreen(l, screenWidth, screenHeight, mappingOpts)
      );

      // Dessiner les connexions du squelette
      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const p1 = screenPoints[startIdx];
        const p2 = screenPoints[endIdx];
        if (p1 && p2) {
          this.graphics
            .moveTo(p1.x, p1.y)
            .lineTo(p2.x, p2.y)
            .stroke({ width: 2, color: boneColor, alpha: 0.75 });
        }
      }

      // Dessiner les repères articulaires
      for (let i = 0; i < screenPoints.length; i++) {
        const p = screenPoints[i];
        if (p) {
          const isFingertip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
          const radius = isFingertip ? 4 : 2.5;

          this.graphics.circle(p.x, p.y, radius).fill({
            color: isFingertip ? boneColor : jointColor,
            alpha: 0.9,
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
