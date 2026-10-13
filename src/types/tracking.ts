export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right';

export interface DetectedHand {
  handedness: Handedness;
  score: number;
  landmarks: Point3D[];
}

export interface TrackingFrame {
  timestampMs: number;
  hands: DetectedHand[];
}

export type TrackingListener = (frame: TrackingFrame) => void;

export interface ITrackingStream {
  subscribe(listener: TrackingListener): () => void;
}
