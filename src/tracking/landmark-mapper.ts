import type { Point3D } from '../types/tracking';

export interface ScreenPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Standard MediaPipe Hands 21-landmark topology.
 * Indices:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */
export const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],

  // Index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],

  // Middle
  [9, 10],
  [10, 11],
  [11, 12],

  // Ring
  [13, 14],
  [14, 15],
  [15, 16],

  // Pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],

  // Palm base mesh
  [5, 9],
  [9, 13],
  [13, 17],
];

/**
 * Maps normalized coordinates [0, 1] to screen pixel space.
 * When mirrored is true, horizontally flips x coordinate (1 - x) to match CSS scaleX(-1) mirror webcam.
 */
export function mapLandmarkToScreen(
  landmark: Point3D,
  screenWidth: number,
  screenHeight: number,
  mirrored: boolean = true
): ScreenPoint {
  const normX = mirrored ? 1 - landmark.x : landmark.x;
  return {
    x: normX * screenWidth,
    y: landmark.y * screenHeight,
    z: landmark.z,
  };
}
