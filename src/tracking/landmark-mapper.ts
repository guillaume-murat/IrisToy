import type { Point3D } from '../types/tracking';

export interface ScreenPoint {
  x: number;
  y: number;
  z: number;
}

export interface ViewportMappingOptions {
  mirrored?: boolean;
  videoWidth?: number;
  videoHeight?: number;
}

/**
 * MediaPipe Hands 21-landmark skeletal topology.
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

  // Palm base connection
  [5, 9],
  [9, 13],
  [13, 17],
];

/**
 * Maps normalized coordinates [0, 1] to screen pixel space.
 * Correctly accounts for CSS object-fit: cover scaling and horizontal mirroring.
 */
export function mapLandmarkToScreen(
  landmark: Point3D,
  screenWidth: number,
  screenHeight: number,
  options: boolean | ViewportMappingOptions = true
): ScreenPoint {
  const opts: ViewportMappingOptions =
    typeof options === 'boolean' ? { mirrored: options } : options;
  const mirrored = opts.mirrored ?? true;

  let renderWidth = screenWidth;
  let renderHeight = screenHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (opts.videoWidth && opts.videoHeight && opts.videoWidth > 0 && opts.videoHeight > 0) {
    const videoAspect = opts.videoWidth / opts.videoHeight;
    const screenAspect = screenWidth / screenHeight;

    if (screenAspect > videoAspect) {
      renderWidth = screenWidth;
      renderHeight = screenWidth / videoAspect;
      offsetY = (screenHeight - renderHeight) / 2;
    } else {
      renderHeight = screenHeight;
      renderWidth = screenHeight * videoAspect;
      offsetX = (screenWidth - renderWidth) / 2;
    }
  }

  const normX = mirrored ? 1 - landmark.x : landmark.x;

  return {
    x: offsetX + normX * renderWidth,
    y: offsetY + landmark.y * renderHeight,
    z: landmark.z,
  };
}
