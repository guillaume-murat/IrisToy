import type { DetectedHand, Point3D } from '../types/tracking';
import { HAND_CONNECTIONS, mapLandmarkToScreen } from '../tracking/landmark-mapper';
import { classifyHandPose, type HandPoseType } from './pose-classifier';

export interface Vector2D {
  x: number;
  y: number;
}

export interface CircleCollider {
  type: 'circle';
  center: Vector2D;
  radius: number;
  velocity: { vx: number; vy: number };
  tag: 'fingertip' | 'palm';
}

export interface CapsuleCollider {
  type: 'capsule';
  start: Vector2D;
  end: Vector2D;
  radius: number;
  velocity: { vx: number; vy: number };
  tag: 'bone';
}

export interface HandColliderSet {
  pose: HandPoseType;
  circles: CircleCollider[];
  capsules: CapsuleCollider[];
}

function computeCentroid(points: Point3D[]): Point3D {
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumZ += p.z ?? 0;
  }
  const count = Math.max(1, points.length);
  return {
    x: sumX / count,
    y: sumY / count,
    z: sumZ / count,
  };
}

export function generateHandColliders(
  currentHand: DetectedHand,
  previousHand: DetectedHand | null,
  screenWidth: number,
  screenHeight: number,
  deltaTimeSeconds: number,
  mirrored: boolean = true
): HandColliderSet {
  const dt = Math.max(0.001, deltaTimeSeconds);
  const pose = classifyHandPose(currentHand.landmarks);

  // Convertir tous les landmarks en coordonnées écran
  const currentPoints = currentHand.landmarks.map((l) =>
    mapLandmarkToScreen(l, screenWidth, screenHeight, mirrored)
  );

  const prevPoints = previousHand
    ? previousHand.landmarks.map((l) => mapLandmarkToScreen(l, screenWidth, screenHeight, mirrored))
    : null;

  // Calculer la vélocité pour chaque landmark
  const velocities = currentPoints.map((curr, idx) => {
    if (!prevPoints || !prevPoints[idx]) {
      return { vx: 0, vy: 0 };
    }
    const prev = prevPoints[idx]!;
    return {
      vx: (curr.x - prev.x) / dt,
      vy: (curr.y - prev.y) / dt,
    };
  });

  const circles: CircleCollider[] = [];
  const capsules: CapsuleCollider[] = [];

  // 1. Bout des 5 doigts (indices 4, 8, 12, 16, 20)
  const tipIndices = [4, 8, 12, 16, 20];
  for (const idx of tipIndices) {
    const pt = currentPoints[idx];
    const vel = velocities[idx] ?? { vx: 0, vy: 0 };
    if (pt) {
      circles.push({
        type: 'circle',
        center: { x: pt.x, y: pt.y },
        radius: 20,
        velocity: vel,
        tag: 'fingertip',
      });
    }
  }

  // 2. Centre de la paume (barycentre du poignet et des bases MCP 0, 5, 9, 13, 17)
  const palmLandmarks = [
    currentHand.landmarks[0]!,
    currentHand.landmarks[5]!,
    currentHand.landmarks[9]!,
    currentHand.landmarks[13]!,
    currentHand.landmarks[17]!,
  ];
  const palmCenterNormalized = computeCentroid(palmLandmarks);
  const palmCenter = mapLandmarkToScreen(palmCenterNormalized, screenWidth, screenHeight, mirrored);

  let palmVel = { vx: 0, vy: 0 };
  if (previousHand) {
    const prevPalmLandmarks = [
      previousHand.landmarks[0]!,
      previousHand.landmarks[5]!,
      previousHand.landmarks[9]!,
      previousHand.landmarks[13]!,
      previousHand.landmarks[17]!,
    ];
    const prevPalmCenterNormalized = computeCentroid(prevPalmLandmarks);
    const prevPalmCenter = mapLandmarkToScreen(
      prevPalmCenterNormalized,
      screenWidth,
      screenHeight,
      mirrored
    );
    palmVel = {
      vx: (palmCenter.x - prevPalmCenter.x) / dt,
      vy: (palmCenter.y - prevPalmCenter.y) / dt,
    };
  }

  circles.push({
    type: 'circle',
    center: { x: palmCenter.x, y: palmCenter.y },
    radius: 40,
    velocity: palmVel,
    tag: 'palm',
  });

  // 3. Capsules pour les segments osseux majeurs
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const p1 = currentPoints[startIdx];
    const p2 = currentPoints[endIdx];
    const v1 = velocities[startIdx] ?? { vx: 0, vy: 0 };
    const v2 = velocities[endIdx] ?? { vx: 0, vy: 0 };

    if (p1 && p2) {
      capsules.push({
        type: 'capsule',
        start: { x: p1.x, y: p1.y },
        end: { x: p2.x, y: p2.y },
        radius: 12,
        velocity: {
          vx: (v1.vx + v2.vx) / 2,
          vy: (v1.vy + v2.vy) / 2,
        },
        tag: 'bone',
      });
    }
  }

  return {
    pose,
    circles,
    capsules,
  };
}
