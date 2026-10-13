import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type {
  DetectedHand,
  Handedness,
  ITrackingStream,
  TrackingFrame,
  TrackingListener,
} from '../types/tracking';

export interface HandLandmarkerConfig {
  wasmUrl?: string;
  modelAssetPath?: string;
  maxHands?: number;
}

export class HandLandmarkerService implements ITrackingStream {
  private handLandmarker: HandLandmarker | null = null;
  private listeners: Set<TrackingListener> = new Set();
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;

  public subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async init(config: HandLandmarkerConfig = {}): Promise<void> {
    const wasmUrl =
      config.wasmUrl ??
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
    const modelAssetPath =
      config.modelAssetPath ??
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

    const vision = await FilesetResolver.forVisionTasks(wasmUrl);

    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: config.maxHands ?? 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch {
      // Fallback sur CPU si WebGL/GPU n'est pas disponible dans l'environnement
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: config.maxHands ?? 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    this.isInitialized = true;
  }

  public detectVideoFrame(video: HTMLVideoElement, timestampMs: number): TrackingFrame | null {
    if (!this.handLandmarker || !this.isInitialized) {
      return null;
    }

    if (video.readyState < 2) {
      return null;
    }

    if (this.isProcessing) {
      return null;
    }

    this.isProcessing = true;
    try {
      const result: HandLandmarkerResult = this.handLandmarker.detectForVideo(video, timestampMs);
      const hands: DetectedHand[] = [];

      for (let i = 0; i < result.landmarks.length; i++) {
        const rawLandmarks = result.landmarks[i];
        const handednessList = result.handednesses[i];

        if (rawLandmarks && rawLandmarks.length === 21) {
          const firstCat = handednessList?.[0];
          const rawHandedness = firstCat?.categoryName ?? 'Right';
          // MediaPipe nomme les mains d'un point de vue selfie / caméra
          const handedness: Handedness = rawHandedness === 'Left' ? 'Left' : 'Right';
          const score = firstCat?.score ?? 1.0;

          hands.push({
            handedness,
            score,
            landmarks: rawLandmarks.map((l) => ({
              x: l.x,
              y: l.y,
              z: l.z,
            })),
          });
        }
      }

      const frame: TrackingFrame = {
        timestampMs,
        hands,
      };

      for (const listener of this.listeners) {
        listener(frame);
      }

      return frame;
    } finally {
      this.isProcessing = false;
    }
  }

  public close(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.isInitialized = false;
  }
}
