export interface BallConfig {
  x: number;
  y: number;
  radius?: number;
  gravity?: number;
  restitution?: number;
  friction?: number;
}

export class Ball {
  public position: { x: number; y: number };
  public velocity: { vx: number; vy: number };
  public radius: number;
  public gravity: number;
  public restitution: number;
  public friction: number;
  public isAlive: boolean;

  constructor(config: BallConfig) {
    this.position = { x: config.x, y: config.y };
    this.velocity = { vx: 0, vy: 0 };
    this.radius = config.radius ?? 32;
    this.gravity = config.gravity ?? 850;
    this.restitution = config.restitution ?? 0.85;
    this.friction = config.friction ?? 0.998;
    this.isAlive = true;
  }

  public step(dt: number, screenWidth: number, screenHeight: number): void {
    if (!this.isAlive) {
      return;
    }

    // Appliquer la gravité et le frottement de l'air
    this.velocity.vy += this.gravity * dt;
    this.velocity.vx *= Math.pow(this.friction, dt * 60);

    // Mettre à jour la position
    this.position.x += this.velocity.vx * dt;
    this.position.y += this.velocity.vy * dt;

    // Collisions avec les bords latéraux de l'écran
    if (this.position.x - this.radius < 0) {
      this.position.x = this.radius;
      this.velocity.vx = Math.abs(this.velocity.vx) * this.restitution;
    } else if (this.position.x + this.radius > screenWidth) {
      this.position.x = screenWidth - this.radius;
      this.velocity.vx = -Math.abs(this.velocity.vx) * this.restitution;
    }

    // Chute sous le bas de l'écran (balle perdue)
    if (this.position.y - this.radius > screenHeight) {
      this.isAlive = false;
    }
  }

  public resolvePenetration(contactCenter: { x: number; y: number }, normal: { x: number; y: number }, minDistance: number): void {
    this.position.x = contactCenter.x + normal.x * (minDistance + 1);
    this.position.y = contactCenter.y + normal.y * (minDistance + 1);
  }

  public applyImpulse(impulseX: number, impulseY: number): void {
    this.velocity.vx += impulseX;
    this.velocity.vy += impulseY;
  }

  public reset(spawnX: number, spawnY: number, initialVx: number = 0, initialVy: number = 0): void {
    this.position = { x: spawnX, y: spawnY };
    this.velocity = { vx: initialVx, vy: initialVy };
    this.isAlive = true;
  }
}
