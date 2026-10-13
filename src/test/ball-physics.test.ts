import { describe, it, expect } from 'vitest';
import { Ball } from '../game/ball';
import { resolveBallHandCollision } from '../game/collision-resolver';
import type { CircleCollider } from '../physics/hand-colliders';

describe('Ball Physics Simulation', () => {
  it('applies gravity over time and moves downwards', () => {
    const ball = new Ball({
      x: 500,
      y: 200,
      radius: 30,
      gravity: 600,
      restitution: 0.7,
    });

    expect(ball.velocity.vy).toBe(0);

    // Simuler 0.1s
    ball.step(0.1, 1000, 800);

    // vy = 0 + 600 * 0.1 = 60 px/s
    expect(ball.velocity.vy).toBeCloseTo(60, 1);
    expect(ball.position.y).toBeGreaterThan(200);
  });

  it('bounces off left and right screen borders', () => {
    const ball = new Ball({
      x: 20,
      y: 200,
      radius: 25,
      gravity: 0,
      restitution: 0.8,
    });
    ball.velocity = { vx: -200, vy: 0 };

    // L'étape suivante touche le mur gauche (x - r < 0)
    ball.step(0.1, 1000, 800);

    expect(ball.position.x).toBeGreaterThanOrEqual(25);
    // vx s'inverse avec la restitution
    expect(ball.velocity.vx).toBeGreaterThan(0);
  });

  it('bounces off the bottom floor so the ball never leaves the screen (POC sandbox mode)', () => {
    const ball = new Ball({
      x: 500,
      y: 785,
      radius: 30,
      gravity: 500,
      restitution: 0.65,
    });
    ball.velocity = { vx: 0, vy: 300 };

    ball.step(0.1, 1000, 800);

    // La balle doit rester en vie et rebondir vers le haut
    expect(ball.isAlive).toBe(true);
    expect(ball.position.y).toBeLessThanOrEqual(800 - 30);
    expect(ball.velocity.vy).toBeLessThan(0); // rebond vers le haut
  });
});

describe('Dynamic Hand Collision & Momentum Transfer', () => {
  it('imparts upward velocity when hand moves upward into the ball', () => {
    const ball = new Ball({
      x: 500,
      y: 400,
      radius: 30,
      gravity: 0,
      restitution: 0.65,
    });
    ball.velocity = { vx: 0, vy: 150 }; // Balle descendant doucement

    // Main remontant vers la balle
    const handCollider: CircleCollider = {
      type: 'circle',
      center: { x: 500, y: 430 },
      radius: 20,
      velocity: { vx: 0, vy: -500 },
      tag: 'fingertip',
    };

    const bounce = resolveBallHandCollision(ball, [handCollider], []);

    expect(bounce.bounced).toBe(true);
    // La balle est propulsée vers le haut de façon maîtrisée
    expect(ball.velocity.vy).toBeLessThan(0);
    expect(ball.position.y).toBeLessThan(handCollider.center.y - handCollider.radius);
  });
});
