import type { DetectedHand, Point3D } from '../types/tracking';
import { HAND_CONNECTIONS, mapLandmarkToScreen, type ViewportMappingOptions } from '../tracking/landmark-mapper';
import { classifyHandPose, type HandPoseType } from './pose-classifier';

export interface Vector2D {
  x: number;
  y: number;
}

export type ColliderTag = 'fingertip' | 'palm' | 'bone';

export interface CircleCollider {
  type: 'circle';
  center: Vector2D;
  radius: number;
  velocity: { vx: number; vy: number };
  tag: ColliderTag;
}

export interface CapsuleCollider {
  type: 'capsule';
  start: Vector2D;
  end: Vector2D;
  radius: number;
  velocity: { vx: number; vy: number };
  tag: ColliderTag;
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

function extractPalmCenter(
  hand: DetectedHand,
  screenWidth: number,
  screenHeight: number,
  mappingOpts: ViewportMappingOptions
): Vector2D {
  const palmLandmarks = [
    hand.landmarks[0]!,
    hand.landmarks[5]!,
    hand.landmarks[9]!,
    hand.landmarks[13]!,
    hand.landmarks[17]!,
  ];
  const centroidNormalized = computeCentroid(palmLandmarks);
  const screenPoint = mapLandmarkToScreen(centroidNormalized, screenWidth, screenHeight, mappingOpts);
  return { x: screenPoint.x, y: screenPoint.y };
}

export function generateHandColliders(
  currentHand: DetectedHand,
  previousHand: DetectedHand | null,
  screenWidth: number,
  screenHeight: number,
  deltaTimeSeconds: number,
  mappingOptions: boolean | ViewportMappingOptions = true
): HandColliderSet {
  const dt = Math.max(0.001, deltaTimeSeconds);
  const pose = classifyHandPose(currentHand.landmarks);
  const mappingOpts: ViewportMappingOptions =
    typeof mappingOptions === 'boolean' ? { mirrored: mappingOptions } : mappingOptions;

  // Convertir tous les landmarks en coordonnées écran
  const currentPoints = currentHand.landmarks.map((l) =>
    mapLandmarkToScreen(l, screenWidth, screenHeight, mappingOpts)
  );

  const prevPoints = previousHand
    ? previousHand.landmarks.map((l) =>
        mapLandmarkToScreen(l, screenWidth, screenHeight, mappingOpts)
      )
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

  // 1. Bout des 5 doigts
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

  // 2. Centre de la paume (barycentre extrait via helper)
  const palmCenter = extractPalmCenter(currentHand, screenWidth, screenHeight, mappingOpts);
  let palmVel = { vx: 0, vy: 0 };

  if (previousHand) {
    const prevPalmCenter = extractPalmCenter(previousHand, screenWidth, screenHeight, mappingOpts);
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

  // 3. Capsules osseuses
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
