import { CameraService } from './camera/camera-service';
import { PixiRenderer } from './rendering/pixi-renderer';

async function bootstrap() {
  const webcamVideo = document.getElementById('webcam') as HTMLVideoElement;
  const pixiContainer = document.getElementById('pixi-container') as HTMLElement;
  const overlayScreen = document.getElementById('overlay-screen') as HTMLElement;
  const modalTitle = document.getElementById('modal-title') as HTMLElement;
  const modalMessage = document.getElementById('modal-message') as HTMLElement;
  const btnRequestCamera = document.getElementById('btn-request-camera') as HTMLButtonElement;
  const statFps = document.getElementById('stat-fps') as HTMLElement;
  const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton') as HTMLButtonElement;

  const cameraService = new CameraService(webcamVideo);
  const pixiRenderer = new PixiRenderer();

  let showSkeleton = true;
  btnToggleSkeleton.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
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
    requestAnimationFrame(updateFps);
  }
  requestAnimationFrame(updateFps);

  async function startApp() {
    overlayScreen.classList.add('hidden');
    try {
      await cameraService.start();
      await pixiRenderer.init(pixiContainer);
      console.log('IrisToy initialized successfully with mirrored camera and PixiJS canvas.');
    } catch (err: unknown) {
      overlayScreen.classList.remove('hidden');
      modalTitle.textContent = 'Accès caméra requis';
      modalMessage.textContent =
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'accès à la webcam.";
      btnRequestCamera.textContent = 'Réessayer';
    }
  }

  btnRequestCamera.addEventListener('click', () => {
    startApp();
  });

  // Tenter de démarrer automatiquement, ou afficher le modal si permission requise
  try {
    await startApp();
  } catch {
    // startApp gère l'affichage du modal d'erreur
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
