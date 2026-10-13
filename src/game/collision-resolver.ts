import type { Ball } from './ball';
import type { CircleCollider, CapsuleCollider, Vector2D } from '../physics/hand-colliders';

export interface BounceEvent {
  hit: boolean;
  normal: Vector2D;
  impulse: number;
  contactPoint: Vector2D;
  colliderTag: string;
}

export function resolveBallHandCollision(
  ball: Ball,
  circles: CircleCollider[],
  capsules: CapsuleCollider[]
): BounceEvent {
  let bestBounce: BounceEvent = {
    hit: false,
    normal: { x: 0, y: -1 },
    impulse: 0,
    contactPoint: { x: ball.position.x, y: ball.position.y },
    colliderTag: '',
  };

  // Helper pour traiter un point de collision circulaire
  function testCircle(
    center: Vector2D,
    radius: number,
    velocity: { vx: number; vy: number },
    tag: string
  ): boolean {
    const dx = ball.position.x - center.x;
    const dy = ball.position.y - center.y;
    const distSq = dx * dx + dy * dy;
    const minDist = ball.radius + radius;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const ny = dy / dist;

      // Résoudre la pénétration géométrique
      ball.position.x = center.x + nx * (minDist + 1);
      ball.position.y = center.y + ny * (minDist + 1);

      // Calcul de la vitesse relative
      const relVx = ball.velocity.vx - velocity.vx;
      const relVy = ball.velocity.vy - velocity.vy;
      const normalVel = relVx * nx + relVy * ny;

      // Si les objets convergent
      if (normalVel < 0) {
        const restitution = ball.restitution;
        const impulse = -(1 + restitution) * normalVel;

        ball.velocity.vx += impulse * nx + 0.6 * velocity.vx;
        ball.velocity.vy += impulse * ny + 0.6 * velocity.vy;

        // Garantir un rebond dynamique vers le haut si frappé par le dessus de la main
        if (ny < -0.2 && ball.velocity.vy > -350) {
          ball.velocity.vy = -Math.max(350, Math.abs(ball.velocity.vy));
        }

        bestBounce = {
          hit: true,
          normal: { x: nx, y: ny },
          impulse: Math.abs(impulse),
          contactPoint: { x: center.x + nx * radius, y: center.y + ny * radius },
          colliderTag: tag,
        };
        return true;
      }
    }
    return false;
  }

  // 1. Tester les colliders circulaires (bouts des doigts et paume)
  for (const c of circles) {
    if (testCircle(c.center, c.radius, c.velocity, c.tag)) {
      return bestBounce;
    }
  }

  // 2. Tester les colliders capsules (os des doigts)
  for (const cap of capsules) {
    const abx = cap.end.x - cap.start.x;
    const aby = cap.end.y - cap.start.y;
    const lenSq = abx * abx + aby * aby;

    let closestPoint: Vector2D;
    if (lenSq < 0.001) {
      closestPoint = { x: cap.start.x, y: cap.start.y };
    } else {
      const apx = ball.position.x - cap.start.x;
      const apy = ball.position.y - cap.start.y;
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
      closestPoint = {
        x: cap.start.x + t * abx,
        y: cap.start.y + t * aby,
      };
    }

    if (testCircle(closestPoint, cap.radius, cap.velocity, cap.tag)) {
      return bestBounce;
    }
  }

  return bestBounce;
}
