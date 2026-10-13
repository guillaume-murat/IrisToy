import { describe, it, expect } from 'vitest';
import { GameSession } from '../game/game-session';

describe('GameSession Lifecycle & Scoring', () => {
  it('starts in PLAYING state with zero score', () => {
    const session = new GameSession();
    expect(session.state).toBe('PLAYING');
    expect(session.currentScore).toBe(0);
    expect(session.bestScore).toBe(0);
  });

  it('increments consecutive bounce score and updates best score', () => {
    const session = new GameSession();

    session.recordBounce(500);
    expect(session.currentScore).toBe(1);
    expect(session.bestScore).toBe(1);

    session.recordBounce(600);
    session.recordBounce(700);
    expect(session.currentScore).toBe(3);
    expect(session.bestScore).toBe(3);
  });

  it('transitions to GAMEOVER on ball drop, resetting combo on restart while preserving bestScore', () => {
    const session = new GameSession();
    session.recordBounce(500);
    session.recordBounce(500);
    expect(session.currentScore).toBe(2);

    session.recordDrop();
    expect(session.state).toBe('GAMEOVER');
    expect(session.currentScore).toBe(2); // score attained in that run
    expect(session.bestScore).toBe(2);

    session.restart();
    expect(session.state).toBe('PLAYING');
    expect(session.currentScore).toBe(0);
    expect(session.bestScore).toBe(2);
  });

  it('handles pause and resume toggle correctly', () => {
    const session = new GameSession();
    expect(session.state).toBe('PLAYING');

    session.togglePause();
    expect(session.state).toBe('PAUSED');

    session.togglePause();
    expect(session.state).toBe('PLAYING');
  });
});
