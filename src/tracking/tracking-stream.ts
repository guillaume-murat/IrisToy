import type { ITrackingStream, TrackingFrame, TrackingListener } from '../types/tracking';

export class MockTrackingStream implements ITrackingStream {
  private listeners: Set<TrackingListener> = new Set();

  public subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public pushFrame(frame: TrackingFrame): void {
    for (const listener of this.listeners) {
      listener(frame);
    }
  }

  public emitSequence(frames: TrackingFrame[]): void {
    for (const frame of frames) {
      this.pushFrame(frame);
    }
  }
}
