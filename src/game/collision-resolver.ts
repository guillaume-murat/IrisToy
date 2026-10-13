import type { Ball } from './ball';
import type { CircleCollider, CapsuleCollider, Vector2D, ColliderTag } from '../physics/hand-colliders';

export interface BounceEvent {
  bounced: boolean;
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
  let resultBounce: BounceEvent = {
    bounced: false,
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

    if (distanceSquared < minDistance * minDistance) {
      const dist = Math.sqrt(distanceSquared) || 0.001;
      const normalX = deltaX / dist;
      const normalY = deltaY / dist;

      // Calcul de la vitesse relative
      const relativeVx = ball.velocity.vx - velocity.vx;
      const relativeVy = ball.velocity.vy - velocity.vy;
      const normalVelocity = relativeVx * normalX + relativeVy * normalY;

      // Seuls les objets en convergence provoquent un rebond
      if (normalVelocity < 0) {
        ball.resolvePenetration(center, { x: normalX, y: normalY }, minDistance);

        const restitution = ball.restitution;
        const impulseMagnitude = -(1 + restitution) * normalVelocity;

        let impulseX = impulseMagnitude * normalX + 0.6 * velocity.vx;
        let impulseY = impulseMagnitude * normalY + 0.6 * velocity.vy;

        // Assurer un rebond ascendant dynamique lorsque frappé par le haut de la main
        if (normalY < -0.2 && ball.velocity.vy + impulseY > -350) {
          impulseY = -350 - ball.velocity.vy;
        }

        ball.applyImpulse(impulseX, impulseY);

        resultBounce = {
          bounced: true,
          normal: { x: normalX, y: normalY },
          impulse: Math.abs(impulseMagnitude),
          contactPoint: { x: center.x + normalX * radius, y: center.y + normalY * radius },
          colliderTag: tag,
        };
        return true;
      }
    }
    return false;
  }

  // 1. Tester les colliders circulaires (bouts des doigts et paume)
  for (const c of circles) {
    if (testContact(c.center, c.radius, c.velocity, c.tag)) {
      return resultBounce;
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
      return resultBounce;
    }
  }

  return resultBounce;
}
