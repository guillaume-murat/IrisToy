import { CameraService } from './camera/camera-service';
import { PixiRenderer } from './rendering/pixi-renderer';
import { HandLandmarkerService } from './tracking/hand-landmarker-service';
import { SkeletonRenderer } from './rendering/skeleton-renderer';
import { ContactRenderer } from './rendering/contact-renderer';
import { BallRenderer } from './rendering/ball-renderer';
import { ParticleSystem } from './rendering/particle-system';
import { AudioEffects } from './audio/audio-effects';
import { Ball } from './game/ball';
import { GameSession } from './game/game-session';
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
  const statScore = document.getElementById('stat-score') as HTMLElement;
  const statBest = document.getElementById('stat-best') as HTMLElement;
  const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton') as HTMLButtonElement;
  const btnTogglePause = document.getElementById('btn-toggle-pause') as HTMLButtonElement;

  const gameoverScreen = document.getElementById('gameover-screen') as HTMLElement;
  const gameoverScore = document.getElementById('gameover-score') as HTMLElement;
  const gameoverBest = document.getElementById('gameover-best') as HTMLElement;
  const btnRestartGame = document.getElementById('btn-restart-game') as HTMLButtonElement;

  const cameraService = new CameraService(webcamVideo);
  const pixiRenderer = new PixiRenderer();
  const handLandmarkerService = new HandLandmarkerService();
  const skeletonRenderer = new SkeletonRenderer();
  const contactRenderer = new ContactRenderer();
  const ballRenderer = new BallRenderer();
  const particleSystem = new ParticleSystem();
  const audioEffects = new AudioEffects();
  const gameSession = new GameSession();

  const ball = new Ball({
    x: window.innerWidth / 2,
    y: 120,
    radius: 36,
    gravity: 800,
    restitution: 0.85,
  });

  function updateScoreDisplay() {
    statScore.textContent = String(gameSession.currentScore);
    statBest.textContent = String(gameSession.bestScore);
    statScore.classList.add('bump');
    setTimeout(() => statScore.classList.remove('bump'), 120);
  }

  function restartGame() {
    gameoverScreen.classList.add('hidden');
    gameSession.restart();
    statScore.textContent = '0';
    statBest.textContent = String(gameSession.bestScore);
    const screenWidth = pixiRenderer.app.screen?.width ?? window.innerWidth;
    ball.reset(screenWidth / 2, 120, (Math.random() - 0.5) * 60, 0);
  }

  gameSession.subscribe((event) => {
    if (event.type === 'bounce') {
      updateScoreDisplay();
      audioEffects.playBounce(event.score);
    } else if (event.type === 'gameover') {
      audioEffects.playDrop();
      gameoverScore.textContent = String(event.score);
      gameoverBest.textContent = String(event.bestScore);
      gameoverScreen.classList.remove('hidden');
    } else if (event.type === 'pause') {
      btnTogglePause.textContent = gameSession.state === 'PAUSED' ? '▶ Reprendre' : '⏸ Pause';
    }
  });

  btnRestartGame.addEventListener('click', restartGame);

  let showSkeleton = true;
  btnToggleSkeleton.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    skeletonRenderer.setVisible(showSkeleton);
    btnToggleSkeleton.textContent = `Squelette: ${showSkeleton ? 'ON' : 'OFF'}`;
    btnToggleSkeleton.classList.toggle('disabled', !showSkeleton);
  });

  btnTogglePause.addEventListener('click', () => {
    gameSession.togglePause();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      btnToggleSkeleton.click();
    } else if (e.key === 'p' || e.key === 'P') {
      btnTogglePause.click();
    } else if (e.key === 'r' || e.key === 'R') {
      restartGame();
    } else if (e.code === 'Space') {
      if (gameSession.state === 'GAMEOVER') {
        restartGame();
      } else {
        gameSession.togglePause();
      }
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

  function gameLoop(now: number) {
    updateFps(now);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastLoopTime) / 1000));
    lastLoopTime = now;

    const screenWidth = pixiRenderer.app.screen?.width ?? window.innerWidth;
    const screenHeight = pixiRenderer.app.screen?.height ?? window.innerHeight;

    const mappingOpts = {
      mirrored: true,
      videoWidth: webcamVideo.videoWidth || 1280,
      videoHeight: webcamVideo.videoHeight || 720,
    };

    // Détection des mains
    const frame = handLandmarkerService.detectVideoFrame(webcamVideo, now);

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
          mappingOpts
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

      skeletonRenderer.render(frame.hands, screenWidth, screenHeight, mappingOpts);
      contactRenderer.render(colliderSets);
    } else {
      skeletonRenderer.render([], screenWidth, screenHeight, mappingOpts);
      contactRenderer.render([]);
    }

    // Mise à jour de la physique et des règles de jeu
    if (gameSession.state === 'PLAYING') {
      if (ball.isAlive) {
        ball.step(dt, screenWidth, screenHeight);

        // Résolution des collisions main / ballon
        const bounce = resolveBallHandCollision(ball, allCircles, allCapsules);
        if (bounce.bounced) {
          gameSession.recordBounce(bounce.impulse);
          const bounceAngle = Math.atan2(bounce.normal.y, bounce.normal.x);
          ballRenderer.triggerBounceEffect(bounceAngle);
          particleSystem.emitBurst(bounce.contactPoint.x, bounce.contactPoint.y, 20);
        }

        // Si le ballon vient de tomber
        if (!ball.isAlive) {
          gameSession.recordDrop();
        }
      }
    }

    // Rendu du ballon et des particules
    ballRenderer.update(ball, dt);
    particleSystem.update(dt);

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
      pixiRenderer.rootContainer.addChild(contactRenderer.container);
      pixiRenderer.rootContainer.addChild(particleSystem.container);
      pixiRenderer.rootContainer.addChild(ballRenderer.container);

      await handLandmarkerService.init();

      console.log('IrisToy initialized successfully. Arcade session ready!');
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

  // Afficher le modal d'explication au lancement pour respecter la User Story 1
  overlayScreen.classList.remove('hidden');
  modalTitle.textContent = 'Accès à la caméra requis';
  modalMessage.textContent =
    'IrisToy utilise votre webcam pour détecter vos mains et vos gestes en temps réel directement dans votre navigateur. Le traitement s’exécute à 100% sur votre appareil : aucune image n’est transmise sur internet.';
  btnRequestCamera.textContent = 'Autoriser la caméra et Jouer';

  btnRequestCamera.addEventListener('click', () => {
    startApp();
  });
}

window.addEventListener('DOMContentLoaded', bootstrap);
