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
  const thumbMcp = landmarks[2]!;
  const indexMcp = landmarks[5]!;
  const indexPip = landmarks[6]!;
  const indexTip = landmarks[8]!;
  const middlePip = landmarks[10]!;
  const middleTip = landmarks[12]!;
  const ringPip = landmarks[14]!;
  const ringTip = landmarks[16]!;
  const pinkyPip = landmarks[18]!;
  const pinkyTip = landmarks[20]!;

  // Pincement : bout du pouce proche du bout de l'index
  const thumbIndexDist = distance(thumbTip, indexTip);
  if (thumbIndexDist < 0.08) {
    return 'Pinch';
  }

  // Extension de chaque doigt : distance du tip au poignet supérieure à la distance du PIP au poignet
  const isIndexExtended = distance(indexTip, wrist) > distance(indexPip, wrist);
  const isMiddleExtended = distance(middleTip, wrist) > distance(middlePip, wrist);
  const isRingExtended = distance(ringTip, wrist) > distance(ringPip, wrist);
  const isPinkyExtended = distance(pinkyTip, wrist) > distance(pinkyPip, wrist);
  const isThumbExtended = distance(thumbTip, indexMcp) > distance(thumbMcp, indexMcp);

  // Main ouverte : 4 ou 5 doigts étendus
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
    return 'OpenPalm';
  }

  // Poing fermé : tous les 4 doigts pliés
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'Fist';
  }

  // Index pointé : seul l'index est étendu
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return 'Pointing';
  }

  return isThumbExtended ? 'OpenPalm' : 'Unknown';
}
