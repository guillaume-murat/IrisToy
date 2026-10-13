import type { Point3D } from '../types/tracking';

export type HandPoseType = 'OpenPalm' | 'Fist' | 'Pinch' | 'Pointing' | 'Unknown';

function distance(p1: Point3D, p2: Point3D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z ?? 0) - (p2.z ?? 0));
}

export function classifyHandPose(landmarks: Point3D[]): HandPoseType {
  if (landmarks.length < 21) {
    return 'Unknown';
  }

  const wrist = landmarks[0]!;
  const thumbTip = landmarks[4]!;
  const indexPip = landmarks[6]!;
  const indexTip = landmarks[8]!;
  const middlePip = landmarks[10]!;
  const middleTip = landmarks[12]!;
  const ringPip = landmarks[14]!;
  const ringTip = landmarks[16]!;
  const pinkyPip = landmarks[18]!;
  const pinkyTip = landmarks[20]!;

  // Extension de chaque doigt : distance du bout du doigt au poignet supérieure à la distance du PIP au poignet
  const isIndexExtended = distance(indexTip, wrist) > distance(indexPip, wrist);
  const isMiddleExtended = distance(middleTip, wrist) > distance(middlePip, wrist);
  const isRingExtended = distance(ringTip, wrist) > distance(ringPip, wrist);
  const isPinkyExtended = distance(pinkyTip, wrist) > distance(pinkyPip, wrist);

  // Poing fermé : les 4 doigts sont pliés
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'Fist';
  }

  // Pincement : pouce et index proches l'un de l'autre, avec l'index non plié en poing
  const thumbIndexDist = distance(thumbTip, indexTip);
  if (thumbIndexDist < 0.08 && isIndexExtended) {
    return 'Pinch';
  }

  // Main ouverte : les 4 doigts sont étendus
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
    return 'OpenPalm';
  }

  // Index pointé : seul l'index est étendu
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'Pointing';
  }

  return 'Unknown';
}
