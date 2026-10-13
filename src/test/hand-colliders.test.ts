import { describe, it, expect } from 'vitest';
import { generateHandColliders } from '../physics/hand-colliders';
import type { DetectedHand } from '../types/tracking';

describe('Hand Colliders Generator', () => {
  it('generates circle colliders for fingertips and palm centroid', () => {
    const hand: DetectedHand = {
      handedness: 'Right',
      score: 0.99,
      landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
    };

    const colliders = generateHandColliders(hand, null, 1000, 800, 0.016);

    // Expect fingertip circles (5) + palm circle (1) = 6 circles
    expect(colliders.circles.length).toBe(6);

    const palmCircle = colliders.circles.find((c) => c.tag === 'palm');
    expect(palmCircle).toBeDefined();
    expect(palmCircle?.radius).toBeGreaterThan(25);
  });

  it('computes collider momentum and velocity vector when previous frame is provided', () => {
    const handPrev: DetectedHand = {
      handedness: 'Right',
      score: 0.99,
      landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6, z: 0 })),
    };

    // Hand moved upwards (y from 0.6 to 0.4) over dt = 0.02s
    const handCurr: DetectedHand = {
      handedness: 'Right',
      score: 0.99,
      landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.4, z: 0 })),
    };

    const colliders = generateHandColliders(handCurr, handPrev, 1000, 1000, 0.02);

    const palm = colliders.circles.find((c) => c.tag === 'palm');
    expect(palm).toBeDefined();

    // In pixel space: prev y = 600, curr y = 400 => delta y = -200px.
    // velocity vy = -200 / 0.02 = -10000 px/s (directed upwards)
    expect(palm?.velocity.vy).toBeCloseTo(-10000, 0);
  });
});
