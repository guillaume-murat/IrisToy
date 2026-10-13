import { describe, it, expect } from 'vitest';
import { classifyHandPose } from '../physics/pose-classifier';
import type { Point3D } from '../types/tracking';

/**
 * Helper to generate synthetic landmark positions.
 * Wrist is at (0.5, 0.9).
 */
function createSyntheticLandmarks(options: {
  thumbExtended: boolean;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  thumbIndexPinch?: boolean;
}): Point3D[] {
  const landmarks: Point3D[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9, z: 0 }));

  // Wrist = 0
  landmarks[0] = { x: 0.5, y: 0.9, z: 0 };

  // Helper for finger: MCP(1), PIP(2), DIP(3), TIP(4) relative to base index
  const setupFinger = (baseIdx: number, extended: boolean, xOffset: number) => {
    landmarks[baseIdx] = { x: 0.5 + xOffset, y: 0.7, z: 0 }; // MCP
    landmarks[baseIdx + 1] = { x: 0.5 + xOffset, y: 0.6, z: 0 }; // PIP
    landmarks[baseIdx + 2] = { x: 0.5 + xOffset, y: 0.5, z: 0 }; // DIP
    if (extended) {
      landmarks[baseIdx + 3] = { x: 0.5 + xOffset, y: 0.35, z: 0 }; // TIP is higher up (smaller y)
    } else {
      landmarks[baseIdx + 3] = { x: 0.5 + xOffset, y: 0.68, z: 0 }; // TIP is curled down close to MCP
    }
  };

  // Thumb: 1, 2, 3, 4
  landmarks[1] = { x: 0.45, y: 0.8, z: 0 };
  landmarks[2] = { x: 0.4, y: 0.75, z: 0 };
  landmarks[3] = { x: 0.35, y: 0.7, z: 0 };
  if (options.thumbIndexPinch) {
    // Thumb tip close to index tip
    landmarks[4] = { x: 0.48, y: 0.36, z: 0 };
  } else if (options.thumbExtended) {
    landmarks[4] = { x: 0.3, y: 0.65, z: 0 };
  } else {
    landmarks[4] = { x: 0.42, y: 0.78, z: 0 };
  }

  setupFinger(5, options.indexExtended, -0.05); // Index
  if (options.thumbIndexPinch) {
    landmarks[8] = { x: 0.485, y: 0.365, z: 0 }; // Index tip touching thumb tip
  }
  setupFinger(9, options.middleExtended, 0.0); // Middle
  setupFinger(13, options.ringExtended, 0.05); // Ring
  setupFinger(17, options.pinkyExtended, 0.1); // Pinky

  return landmarks;
}

describe('Pose Classifier', () => {
  it('classifies Open Palm when all fingers are extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true,
    });

    const pose = classifyHandPose(landmarks);
    expect(pose).toBe('OpenPalm');
  });

  it('classifies Fist when all fingers are curled', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
    });

    const pose = classifyHandPose(landmarks);
    expect(pose).toBe('Fist');
  });

  it('classifies Pointing when only index finger is extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: true,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
    });

    const pose = classifyHandPose(landmarks);
    expect(pose).toBe('Pointing');
  });

  it('classifies Pinch when thumb tip is adjacent to index tip', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
      thumbIndexPinch: true,
    });

    const pose = classifyHandPose(landmarks);
    expect(pose).toBe('Pinch');
  });
});
