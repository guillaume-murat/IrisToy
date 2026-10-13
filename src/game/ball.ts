export interface BallConfig {
  x: number;
  y: number;
  radius?: number;
  gravity?: number;
  restitution?: number;
  friction?: number;
  maxSpeed?: number;
}

export class Ball {
  public position: { x: number; y: number };
  public velocity: { vx: number; vy: number };
  public radius: number;
  public gravity: number;
  public restitution: number;
  public friction: number;
  public maxSpeed: number;
  public isAlive: boolean;

  constructor(config: BallConfig) {
    this.position = { x: config.x, y: config.y };
    this.velocity = { vx: 0, vy: 0 };
    this.radius = config.radius ?? 34;
    this.gravity = config.gravity ?? 500; // Gravité plus douce et aérienne
    this.restitution = config.restitution ?? 0.65; // Rebond modéré et doux
    this.friction = config.friction ?? 0.995;
    this.maxSpeed = config.maxSpeed ?? 520; // Vitesse maximale plafonnée pour éviter les fusées
    this.isAlive = true;
  }

  public step(dt: number, screenWidth: number, screenHeight: number): void {
    if (!this.isAlive) {
      return;
    }

    // Appliquer la gravité et le frottement de l'air
    this.velocity.vy += this.gravity * dt;
    this.velocity.vx *= Math.pow(this.friction, dt * 60);

    // Plafonner la vitesse globale
    const currentSpeed = Math.hypot(this.velocity.vx, this.velocity.vy);
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed;
      this.velocity.vx *= scale;
      this.velocity.vy *= scale;
    }

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

    // Collision avec le plafond
    if (this.position.y - this.radius < 0) {
      this.position.y = this.radius;
      this.velocity.vy = Math.abs(this.velocity.vy) * this.restitution;
    }

    // Collision avec le sol : rebondit au lieu de tomber, ne sort jamais du cadre (mode bac à sable)
    if (this.position.y + this.radius > screenHeight) {
      this.position.y = screenHeight - this.radius;
      this.velocity.vy = -Math.abs(this.velocity.vy) * this.restitution;
      this.velocity.vx *= 0.92; // Léger frottement au sol
    }
  }

  public resolvePenetration(contactCenter: { x: number; y: number }, normal: { x: number; y: number }, minDistance: number): void {
    this.position.x = contactCenter.x + normal.x * (minDistance + 1);
    this.position.y = contactCenter.y + normal.y * (minDistance + 1);
  }

  public applyImpulse(impulseX: number, impulseY: number): void {
    this.velocity.vx += impulseX;
    this.velocity.vy += impulseY;

    // Plafonner immédiatement pour éviter toute secousse brutale
    const currentSpeed = Math.hypot(this.velocity.vx, this.velocity.vy);
    if (currentSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / currentSpeed;
      this.velocity.vx *= scale;
      this.velocity.vy *= scale;
    }
  }

  public reset(spawnX: number, spawnY: number, initialVx: number = 0, initialVy: number = 0): void {
    this.position = { x: spawnX, y: spawnY };
    this.velocity = { vx: initialVx, vy: initialVy };
    this.isAlive = true;
  }
}
