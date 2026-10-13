import { Application, Container } from 'pixi.js';

export interface PixiRendererConfig {
  canvas?: HTMLCanvasElement;
  resizeTo?: Window | HTMLElement;
}

export class PixiRenderer {
  public app: Application;
  public rootContainer: Container;

  constructor() {
    this.app = new Application();
    this.rootContainer = new Container();
  }

  public async init(containerElement: HTMLElement): Promise<void> {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: containerElement,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    this.app.stage.addChild(this.rootContainer);
    containerElement.appendChild(this.app.canvas);
  }

  public destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }
}
