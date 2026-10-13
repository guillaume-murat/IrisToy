import type { Ball } from './ball';
import type { CircleCollider, CapsuleCollider, Vector2D, ColliderTag } from '../physics/hand-colliders';

export interface BounceEvent {
  bounced: boolean;
  resting: boolean;
  normal: Vector2D;
  impulse: number;
  contactPoint: Vector2D;
  colliderTag: ColliderTag;
}

export function resolveBallHandCollision(
  ball: Ball,
  circles: CircleCollider[],
  capsules: CapsuleCollider[]
): BounceEvent {
  let resultCollision: BounceEvent = {
    bounced: false,
    resting: false,
    normal: { x: 0, y: -1 },
    impulse: 0,
    contactPoint: { x: ball.position.x, y: ball.position.y },
    colliderTag: 'palm',
  };

  function testContact(
    center: Vector2D,
    radius: number,
    velocity: { vx: number; vy: number },
    tag: ColliderTag
  ): boolean {
    const deltaX = ball.position.x - center.x;
    const deltaY = ball.position.y - center.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    const minDistance = ball.radius + radius;

    // Contact ou chevauchement physique détecté
    if (distanceSquared < minDistance * minDistance) {
      const dist = Math.sqrt(distanceSquared) || 0.001;
      const normalX = deltaX / dist;
      const normalY = deltaY / dist;

      // 1. Toujours repousser immédiatement la balle hors de la main (impossible de traverser)
      ball.resolvePenetration(center, { x: normalX, y: normalY }, minDistance);

      // Calcul de la vitesse relative entre la balle et la main
      const relativeVx = ball.velocity.vx - velocity.vx;
      const relativeVy = ball.velocity.vy - velocity.vy;
      const normalVelocity = relativeVx * normalX + relativeVy * normalY;

      // La main soutient la balle par le dessous (normale pointant vers le haut)
      const isSupportingFromBelow = normalY < -0.2;

      // Si la balle et la main convergent
      if (normalVelocity < 0) {
        const impactSpeed = Math.abs(normalVelocity);

        // Frappe dynamique (mouvement rapide ou impact franc)
        if (impactSpeed > 60) {
          const restitution = ball.restitution;
          let impulseMagnitude = -(1 + restitution) * normalVelocity * 0.6;
          impulseMagnitude = Math.min(impulseMagnitude, 260);

          const handBonusX = Math.max(-160, Math.min(160, velocity.vx * 0.18));
          const handBonusY = Math.max(-220, Math.min(80, velocity.vy * 0.22));

          let impulseX = impulseMagnitude * normalX + handBonusX;
          let impulseY = impulseMagnitude * normalY + handBonusY;

          if (isSupportingFromBelow && ball.velocity.vy + impulseY > -140) {
            impulseY = -140 - ball.velocity.vy;
          }

          impulseX = Math.max(-260, Math.min(260, impulseX));
          impulseY = Math.max(-340, Math.min(160, impulseY));

          ball.applyImpulse(impulseX, impulseY);

          resultCollision = {
            bounced: true,
            resting: false,
            normal: { x: normalX, y: normalY },
            impulse: Math.abs(impulseMagnitude),
            contactPoint: { x: center.x + normalX * radius, y: center.y + normalY * radius },
            colliderTag: tag,
          };
          return true;
        } else {
          // Contact doux / Repos : La balle repose confortablement sur la main sans rebond brutal
          if (isSupportingFromBelow) {
            ball.velocity.vy = velocity.vy; // La balle suit le déplacement vertical de la main
            ball.velocity.vx = velocity.vx * 0.75; // La balle suit le déplacement horizontal
          } else {
            // Glissement doux le long du doigt
            ball.velocity.vx -= normalVelocity * normalX;
            ball.velocity.vy -= normalVelocity * normalY;
          }

          resultCollision = {
            bounced: false,
            resting: true,
            normal: { x: normalX, y: normalY },
            impulse: 0,
            contactPoint: { x: center.x + normalX * radius, y: center.y + normalY * radius },
            colliderTag: tag,
          };
          return true;
        }
      } else if (isSupportingFromBelow) {
        // Objets en contact stable sans vitesse de pénétration : maintenir la balle sur la main
        ball.velocity.vy = Math.min(ball.velocity.vy, velocity.vy);
        ball.velocity.vx = ball.velocity.vx * 0.9 + velocity.vx * 0.1;

        resultCollision = {
          bounced: false,
          resting: true,
          normal: { x: normalX, y: normalY },
          impulse: 0,
          contactPoint: { x: center.x + normalX * radius, y: center.y + normalY * radius },
          colliderTag: tag,
        };
        return true;
      }
    }
    return false;
  }

  // 1. Tester les colliders circulaires (paume et bouts des doigts)
  for (const c of circles) {
    if (testContact(c.center, c.radius, c.velocity, c.tag)) {
      return resultCollision;
    }
  }

  // 2. Tester les capsules osseuses
  for (const cap of capsules) {
    const segmentX = cap.end.x - cap.start.x;
    const segmentY = cap.end.y - cap.start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    let closestPoint: Vector2D;
    if (segmentLengthSquared < 0.001) {
      closestPoint = { x: cap.start.x, y: cap.start.y };
    } else {
      const toBallX = ball.position.x - cap.start.x;
      const toBallY = ball.position.y - cap.start.y;
      const projectionFraction = Math.max(
        0,
        Math.min(1, (toBallX * segmentX + toBallY * segmentY) / segmentLengthSquared)
      );
      closestPoint = {
        x: cap.start.x + projectionFraction * segmentX,
        y: cap.start.y + projectionFraction * segmentY,
      };
    }

    if (testContact(closestPoint, cap.radius, cap.velocity, cap.tag)) {
      return resultCollision;
    }
  }

  return resultCollision;
}
