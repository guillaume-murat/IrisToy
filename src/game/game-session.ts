export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type GameEventListener = (event: {
  type: 'bounce' | 'gameover' | 'restart' | 'pause';
  score: number;
  bestScore: number;
}) => void;

export class GameSession {
  public state: GameState = 'PLAYING';
  public currentScore: number = 0;
  public bestScore: number = 0;
  private listeners: Set<GameEventListener> = new Set();

  public subscribe(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(type: 'bounce' | 'gameover' | 'restart' | 'pause'): void {
    for (const listener of this.listeners) {
      listener({
        type,
        score: this.currentScore,
        bestScore: this.bestScore,
      });
    }
  }

  public recordBounce(_impulse: number = 0): void {
    if (this.state !== 'PLAYING') {
      return;
    }

    this.currentScore++;
    if (this.currentScore > this.bestScore) {
      this.bestScore = this.currentScore;
    }

    this.emit('bounce');
  }

  public recordDrop(): void {
    if (this.state !== 'PLAYING') {
      return;
    }

    this.state = 'GAMEOVER';
    this.emit('gameover');
  }

  public restart(): void {
    this.currentScore = 0;
    this.state = 'PLAYING';
    this.emit('restart');
  }

  public togglePause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.emit('pause');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.emit('pause');
    }
  }
}
