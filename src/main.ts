import { CameraService } from './camera/camera-service';
import { PixiRenderer } from './rendering/pixi-renderer';
import { HandLandmarkerService } from './tracking/hand-landmarker-service';
import { SkeletonRenderer } from './rendering/skeleton-renderer';
import { ContactRenderer } from './rendering/contact-renderer';
import { generateHandColliders, type HandColliderSet } from './physics/hand-colliders';
import type { DetectedHand, Handedness } from './types/tracking';

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
  const contactRenderer = new ContactRenderer();

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

  // Calcul du framerate
  let lastFpsTime = performance.now();
  let frameCount = 0;
  let fps = 0;

  function updateFps(now: number) {
    frameCount++;
    const delta = now - lastFpsTime;
    if (delta >= 500) {
      fps = Math.round((frameCount * 1000) / delta);
      statFps.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  // Suivi temporel des mains pour le calcul des vitesses
  const prevHandsMap = new Map<Handedness, DetectedHand>();
  let lastLoopTime = performance.now();

  function gameLoop(now: number) {
    updateFps(now);
    const dt = Math.max(0.001, (now - lastLoopTime) / 1000);
    lastLoopTime = now;

    const frame = handLandmarkerService.detectVideoFrame(webcamVideo, now);

    const screenWidth = pixiRenderer.app.screen?.width ?? window.innerWidth;
    const screenHeight = pixiRenderer.app.screen?.height ?? window.innerHeight;

    if (frame) {
      const colliderSets: HandColliderSet[] = [];
      const currentHandedness = new Set<Handedness>();

      for (const hand of frame.hands) {
        currentHandedness.add(hand.handedness);
        const prevHand = prevHandsMap.get(hand.handedness) ?? null;
        const colliders = generateHandColliders(
          hand,
          prevHand,
          screenWidth,
          screenHeight,
          dt,
          true
        );
        colliderSets.push(colliders);
        prevHandsMap.set(hand.handedness, hand);
      }

      // Nettoyer les mains qui ne sont plus détectées
      for (const handedness of prevHandsMap.keys()) {
        if (!currentHandedness.has(handedness)) {
          prevHandsMap.delete(handedness);
        }
      }

      const poseLabels = colliderSets.map((c) => c.pose).join(' | ');
      statHands.textContent = `Mains: ${frame.hands.length}${poseLabels ? ` (${poseLabels})` : ''}`;

      skeletonRenderer.render(frame.hands, screenWidth, screenHeight, true);
      contactRenderer.render(colliderSets);
    } else {
      skeletonRenderer.render([], screenWidth, screenHeight, true);
      contactRenderer.render([]);
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

      // Ajouter le conteneur du squelette puis des contacts au stage PixiJS
      pixiRenderer.rootContainer.addChild(skeletonRenderer.container);
      pixiRenderer.rootContainer.addChild(contactRenderer.container);

      await handLandmarkerService.init();

      console.log('IrisToy initialized successfully with colliders & pose detection.');
      lastLoopTime = performance.now();
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
    // startApp gère l'erreur
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
