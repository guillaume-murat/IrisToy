import { CameraService } from './camera/camera-service';
import { PixiRenderer } from './rendering/pixi-renderer';
import { HandLandmarkerService } from './tracking/hand-landmarker-service';
import { SkeletonRenderer } from './rendering/skeleton-renderer';
import { ContactRenderer } from './rendering/contact-renderer';
import { BallRenderer } from './rendering/ball-renderer';
import { Ball } from './game/ball';
import { resolveBallHandCollision } from './game/collision-resolver';
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
  const ballRenderer = new BallRenderer();

  // Ballon virtuel
  const ball = new Ball({
    x: window.innerWidth / 2,
    y: 120,
    radius: 36,
    gravity: 800,
    restitution: 0.85,
  });

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
    } else if (e.key === 'r' || e.key === 'R') {
      // Touche 'R' pour faire réapparaître le ballon manuellement
      ball.reset(pixiRenderer.app.screen.width / 2, 100, (Math.random() - 0.5) * 100, 0);
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

  const prevHandsMap = new Map<Handedness, DetectedHand>();
  let lastLoopTime = performance.now();
  let respawnTimer = 0;

  function gameLoop(now: number) {
    updateFps(now);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastLoopTime) / 1000));
    lastLoopTime = now;

    const frame = handLandmarkerService.detectVideoFrame(webcamVideo, now);

    const screenWidth = pixiRenderer.app.screen?.width ?? window.innerWidth;
    const screenHeight = pixiRenderer.app.screen?.height ?? window.innerHeight;

    const allCircles: HandColliderSet['circles'] = [];
    const allCapsules: HandColliderSet['capsules'] = [];
    const colliderSets: HandColliderSet[] = [];

    if (frame) {
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
        allCircles.push(...colliders.circles);
        allCapsules.push(...colliders.capsules);
        prevHandsMap.set(hand.handedness, hand);
      }

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

    // Mise à jour de la physique du ballon
    if (ball.isAlive) {
      ball.step(dt, screenWidth, screenHeight);

      // Résolution des collisions avec les mains du joueur
      const bounce = resolveBallHandCollision(ball, allCircles, allCapsules);
      if (bounce.hit) {
        const bounceAngle = Math.atan2(bounce.normal.y, bounce.normal.x);
        ballRenderer.triggerBounceEffect(bounceAngle);
      }
    } else {
      // Recommencer automatiquement après 1 seconde si le ballon est tombé
      respawnTimer += dt;
      if (respawnTimer >= 1.2) {
        ball.reset(screenWidth / 2, 100, (Math.random() - 0.5) * 80, 0);
        respawnTimer = 0;
      }
    }

    ballRenderer.update(ball, dt);

    requestAnimationFrame(gameLoop);
  }

  async function startApp() {
    overlayScreen.classList.add('hidden');
    try {
      modalTitle.textContent = 'Chargement en cours...';
      modalMessage.textContent = 'Initialisation de la caméra et du modèle de vision IA...';

      await cameraService.start();
      await pixiRenderer.init(pixiContainer);

      // Ordre d'affichage dans PixiJS :
      // 1. Squelette debug
      // 2. Halos tactiles
      // 3. Ballon
      pixiRenderer.rootContainer.addChild(skeletonRenderer.container);
      pixiRenderer.rootContainer.addChild(contactRenderer.container);
      pixiRenderer.rootContainer.addChild(ballRenderer.container);

      await handLandmarkerService.init();

      console.log('IrisToy initialized successfully with hand bouncing physics.');
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
    // startApp gère l'affichage du modal
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
