import { describe, it, expect, vi } from 'vitest';
import { MockTrackingStream } from '../tracking/tracking-stream';
import type { TrackingFrame } from '../types/tracking';

describe('MockTrackingStream seam', () => {
  it('allows subscribers to receive synthetic tracking frames deterministically', () => {
    const stream = new MockTrackingStream();
    const framesReceived: TrackingFrame[] = [];

    const unsubscribe = stream.subscribe((frame) => {
      framesReceived.push(frame);
    });

    const sampleFrame: TrackingFrame = {
      timestampMs: 1000,
      hands: [
        {
          handedness: 'Right',
          score: 0.98,
          landmarks: Array.from({ length: 21 }, (_, i) => ({
            x: 0.5 + i * 0.01,
            y: 0.5 + i * 0.01,
            z: 0.0,
          })),
        },
      ],
    };

    stream.pushFrame(sampleFrame);

    expect(framesReceived).toHaveLength(1);
    expect(framesReceived[0]?.hands[0]?.handedness).toBe('Right');
    expect(framesReceived[0]?.hands[0]?.landmarks).toHaveLength(21);

    unsubscribe();
    stream.pushFrame({
      timestampMs: 1016,
      hands: [],
    });

    expect(framesReceived).toHaveLength(1);
  });

  it('can schedule a sequenced sequence of simulated frames', () => {
    const stream = new MockTrackingStream();
    const callback = vi.fn();
    stream.subscribe(callback);

    stream.emitSequence([
      { timestampMs: 0, hands: [] },
      { timestampMs: 16, hands: [] },
    ]);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
