export interface CameraConfig {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
}

export class CameraService {
  private stream: MediaStream | null = null;
  public videoElement: HTMLVideoElement;

  constructor(videoElement?: HTMLVideoElement) {
    this.videoElement = videoElement ?? document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
  }

  public async start(config: CameraConfig = {}): Promise<HTMLVideoElement> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "L'accès à la caméra n'est pas pris en charge par ce navigateur ou nécessite un contexte sécurisé (HTTPS ou localhost)."
      );
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: config.width ?? 1280 },
        height: { ideal: config.height ?? 720 },
        facingMode: config.facingMode ?? 'user',
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;

      await new Promise<void>((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve).catch(reject);
        };
        this.videoElement.onerror = (err) => reject(err);
      });

      return this.videoElement;
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("Accès à la caméra refusé. Veuillez autoriser l'accès à la webcam pour jouer.");
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('Aucune webcam détectée sur cet appareil.');
        }
      }
      throw new Error(
        `Impossible d'initialiser la webcam : ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    this.videoElement.srcObject = null;
  }
}
