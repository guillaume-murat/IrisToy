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
      gravity: 1000,
      restitution: 0.8,
    });

    expect(ball.velocity.vy).toBe(0);

    // Simulate 0.1s
    ball.step(0.1, 1000, 800);

    // vy = 0 + 1000 * 0.1 = 100 px/s
    expect(ball.velocity.vy).toBeCloseTo(100, 1);
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

    // Next step will penetrate left wall (x - r < 0)
    ball.step(0.1, 1000, 800);

    expect(ball.position.x).toBeGreaterThanOrEqual(25);
    // vx should reverse with restitution: -(-200) * 0.8 = +160
    expect(ball.velocity.vx).toBeGreaterThan(0);
  });

  it('marks ball as dead when it drops below the screen bottom', () => {
    const ball = new Ball({
      x: 500,
      y: 790,
      radius: 30,
      gravity: 500,
    });
    ball.velocity = { vx: 0, vy: 400 };

    ball.step(0.1, 1000, 800);

    expect(ball.isAlive).toBe(false);

    ball.reset(500, 100);
    expect(ball.isAlive).toBe(true);
    expect(ball.position.y).toBe(100);
  });
});

describe('Dynamic Hand Collision & Momentum Transfer', () => {
  it('imparts upward velocity when hand moves upward into the ball', () => {
    const ball = new Ball({
      x: 500,
      y: 400,
      radius: 30,
      gravity: 0,
      restitution: 0.8,
    });
    ball.velocity = { vx: 0, vy: 200 }; // Ball falling down

    // Hand fingertip collider moving fast upward (vy = -800 px/s)
    const handCollider: CircleCollider = {
      type: 'circle',
      center: { x: 500, y: 430 }, // Overlaps ball (dist = 30, sum of radii = 30 + 20 = 50)
      radius: 20,
      velocity: { vx: 0, vy: -800 },
      tag: 'fingertip',
    };

    const bounce = resolveBallHandCollision(ball, [handCollider], []);

    expect(bounce.hit).toBe(true);
    // Ball should be propelled upward (vy < 0)
    expect(ball.velocity.vy).toBeLessThan(0);
    // Position should be resolved above the hand collider
    expect(ball.position.y).toBeLessThan(handCollider.center.y - handCollider.radius);
  });
});
