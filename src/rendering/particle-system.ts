import { Container, Graphics } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
  alpha: number;
  maxLife: number;
  currentLife: number;
}

export class ParticleSystem {
  public container: Container;
  private graphics: Graphics;
  private particles: Particle[] = [];

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public emitBurst(
    x: number,
    y: number,
    count: number = 18,
    baseColor: number = 0x38bdf8
  ): void {
    const colors = [baseColor, 0x60a5fa, 0xa855f7, 0xffffff];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 320;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const maxLife = 0.35 + Math.random() * 0.35;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 3.5,
        color,
        alpha: 1.0,
        maxLife,
        currentLife: maxLife,
      });
    }
  }

  public update(dt: number): void {
    this.graphics.clear();
    if (this.particles.length === 0) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.currentLife -= dt;

      if (p.currentLife <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 450 * dt; // Gravité sur les particules
      p.alpha = p.currentLife / p.maxLife;

      this.graphics.circle(p.x, p.y, p.radius * p.alpha).fill({
        color: p.color,
        alpha: p.alpha,
      });
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
