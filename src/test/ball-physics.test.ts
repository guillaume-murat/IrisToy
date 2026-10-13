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

    ball.step(0.1, 1000, 800);

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

    ball.step(0.1, 1000, 800);

    expect(ball.position.x).toBeGreaterThanOrEqual(25);
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

    expect(ball.isAlive).toBe(true);
    expect(ball.position.y).toBeLessThanOrEqual(800 - 30);
    expect(ball.velocity.vy).toBeLessThan(0);
  });
});

describe('Dynamic Hand Collision & Resting / Holding Support', () => {
  it('imparts upward velocity when hand moves upward into the ball', () => {
    const ball = new Ball({
      x: 500,
      y: 400,
      radius: 30,
      gravity: 0,
      restitution: 0.65,
    });
    ball.velocity = { vx: 0, vy: 150 };

    const handCollider: CircleCollider = {
      type: 'circle',
      center: { x: 500, y: 430 },
      radius: 20,
      velocity: { vx: 0, vy: -500 },
      tag: 'fingertip',
    };

    const bounce = resolveBallHandCollision(ball, [handCollider], []);

    expect(bounce.bounced).toBe(true);
    expect(ball.velocity.vy).toBeLessThan(0);
    expect(ball.position.y).toBeLessThan(handCollider.center.y - handCollider.radius);
  });

  it('allows holding and resting the ball on a stationary hand without falling through', () => {
    const ball = new Ball({
      x: 500,
      y: 420,
      radius: 35,
      gravity: 480,
    });
    ball.velocity = { vx: 0, vy: 20 }; // Very slow gentle descent into palm

    const palmCollider: CircleCollider = {
      type: 'circle',
      center: { x: 500, y: 460 }, // Palm center under ball
      radius: 50,
      velocity: { vx: 0, vy: 0 }, // Stationary hand
      tag: 'palm',
    };

    // Collision should resolve penetration and keep ball resting on top
    const collision = resolveBallHandCollision(ball, [palmCollider], []);

    expect(collision.resting || collision.bounced).toBe(true);
    // Ball must be pushed out on top of palm
    const minDistance = ball.radius + palmCollider.radius;
    expect(ball.position.y).toBeCloseTo(palmCollider.center.y - minDistance - 1, 0);
    // Downward velocity must be stopped so it does not sink
    expect(ball.velocity.vy).toBeLessThanOrEqual(0);
  });
});
