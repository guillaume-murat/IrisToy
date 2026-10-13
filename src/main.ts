import { CameraService } from './camera/camera-service';
import { PixiRenderer } from './rendering/pixi-renderer';
import { HandLandmarkerService } from './tracking/hand-landmarker-service';
import { SkeletonRenderer } from './rendering/skeleton-renderer';

async function bootstrap() {
  const webcamVideo = document.getElementById('webcam') as HTMLVideoElement;
  const pixiContainer = document.getElementById('pixi-container') as HTMLElement;
  const overlayScreen = document.getElementById('overlay-screen') as HTMLElement;
  const modalTitle = document.getElementById('modal-title') as HTMLElement;
  const modalMessage = document.getElementById('modal-message') as HTMLElement;
  const btnRequestCamera = document.getElementById('btn-request-camera') as HTMLButtonElement;
  const statFps = document.getElementById('stat-fps') as HTMLElement;
  const statHands = document.getElementById('stat-hands') as HTMLElement;
  const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton') as HTMLButtonElement;

  const cameraService = new CameraService(webcamVideo);
  const pixiRenderer = new PixiRenderer();
  const handLandmarkerService = new HandLandmarkerService();
  const skeletonRenderer = new SkeletonRenderer();

  let showSkeleton = true;
  btnToggleSkeleton.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    skeletonRenderer.setVisible(showSkeleton);
    btnToggleSkeleton.textContent = `Squelette: ${showSkeleton ? 'ON' : 'OFF'}`;
    btnToggleSkeleton.classList.toggle('disabled', !showSkeleton);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      btnToggleSkeleton.click();
    }
  });

  // Gestion du calcul des FPS
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;

  function updateFps() {
    frameCount++;
    const now = performance.now();
    const delta = now - lastTime;
    if (delta >= 500) {
      fps = Math.round((frameCount * 1000) / delta);
      statFps.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastTime = now;
    }
  }

  // Boucle principale de tracking et de rendu
  function gameLoop() {
    updateFps();

    const timestampMs = performance.now();
    const frame = handLandmarkerService.detectVideoFrame(webcamVideo, timestampMs);

    const screenWidth = pixiRenderer.app.screen?.width ?? window.innerWidth;
    const screenHeight = pixiRenderer.app.screen?.height ?? window.innerHeight;

    if (frame) {
      statHands.textContent = `Mains: ${frame.hands.length}`;
      skeletonRenderer.render(frame.hands, screenWidth, screenHeight, true);
    } else {
      skeletonRenderer.render([], screenWidth, screenHeight, true);
    }

    requestAnimationFrame(gameLoop);
  }

  async function startApp() {
    overlayScreen.classList.add('hidden');
    try {
      modalTitle.textContent = 'Chargement en cours...';
      modalMessage.textContent = 'Initialisation de la caméra et du modèle de vision IA...';

      await cameraService.start();
      await pixiRenderer.init(pixiContainer);
      pixiRenderer.rootContainer.addChild(skeletonRenderer.container);

      // Initialiser le modèle MediaPipe HandLandmarker
      await handLandmarkerService.init();

      console.log('IrisToy initialized successfully with HandLandmarker and PixiJS.');
      requestAnimationFrame(gameLoop);
    } catch (err: unknown) {
      overlayScreen.classList.remove('hidden');
      modalTitle.textContent = 'Erreur d’initialisation';
      modalMessage.textContent =
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'accès à la webcam.";
      btnRequestCamera.textContent = 'Réessayer';
    }
  }

  btnRequestCamera.addEventListener('click', () => {
    startApp();
  });

  try {
    await startApp();
  } catch {
    // startApp gère l'affichage du modal
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
