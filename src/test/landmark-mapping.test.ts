import { describe, it, expect } from 'vitest';
import { mapLandmarkToScreen, HAND_CONNECTIONS } from '../tracking/landmark-mapper';
import type { Point3D } from '../types/tracking';

describe('Landmark Mapping & Skeleton Topology', () => {
  it('maps normalized coordinates to screen pixel coordinates with mirroring', () => {
    const rawPoint: Point3D = { x: 0.2, y: 0.4, z: -0.1 };
    const screenWidth = 1000;
    const screenHeight = 600;

    // With mirror mode (default for webcam mirroring), x becomes (1 - 0.2) * 1000 = 800
    const screenPoint = mapLandmarkToScreen(rawPoint, screenWidth, screenHeight, true);

    expect(screenPoint.x).toBeCloseTo(800);
    expect(screenPoint.y).toBeCloseTo(240);
  });

  it('maps normalized coordinates without mirroring when mirrored is false', () => {
    const rawPoint: Point3D = { x: 0.2, y: 0.4, z: -0.1 };
    const screenPoint = mapLandmarkToScreen(rawPoint, 1000, 600, false);

    expect(screenPoint.x).toBeCloseTo(200);
    expect(screenPoint.y).toBeCloseTo(240);
  });

  it('contains the standard 21-landmark topology with complete hand bone connections', () => {
    // 21 points standard: wrist(0), 4 points per 5 fingers (1-4, 5-8, 9-12, 13-16, 17-20)
    expect(HAND_CONNECTIONS.length).toBeGreaterThan(15);

    // Each connection connects valid landmark indices between 0 and 20
    for (const [start, end] of HAND_CONNECTIONS) {
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThanOrEqual(20);
      expect(end).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(20);
      expect(start).not.toEqual(end);
    }

    // Verify key connections: Wrist to Thumb CMC (0 -> 1), Wrist to Index MCP (0 -> 5), etc.
    expect(HAND_CONNECTIONS).toContainEqual([0, 1]);
    expect(HAND_CONNECTIONS).toContainEqual([0, 5]);
    expect(HAND_CONNECTIONS).toContainEqual([0, 17]);
  });
});
