export const PHYSICS = Object.freeze({ speed: 330, acceleration: 2600, friction: 2200, gravity: 1700, jump: 650, doubleJump: 610, dashSpeed: 820, dashTime: .145, dashCooldown: .78, maxFall: 1100, coyote: .11, buffer: .13 });
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function approach(value, target, amount) { return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target); }
export function createPlayer(spawn = { x: 90, y: 520 }) { return { x: spawn.x, y: spawn.y, w: 34, h: 56, vx: 0, vy: 0, direction: 1, grounded: false, support: null, jumps: 0, coyote: 0, jumpBuffer: 0, dashTimer: 0, dashCooldown: 0, invulnerable: 0, previousY: spawn.y }; }

const overlapsWidth = (p, platform) => p.x + p.w > platform.x && p.x < platform.x + platform.w;

function findLanding(p, platforms, previousBottom, nextBottom) {
  let landing = null, firstContact = Infinity;
  for (const platform of platforms) {
    if (!overlapsWidth(p, platform)) continue;
    // A vertical lift supplies its previous top. Compare relative motion so a
    // descending lift can be landed on and a rider can pass through from below.
    const moving = platform.previousY !== undefined;
    const before = previousBottom - (platform.previousY ?? platform.y);
    const after = nextBottom - platform.y;
    if (before > (moving ? 1e-7 : 2) || after < 0 || after <= before) continue;
    const contact = Math.max(0, -before / (after - before));
    if (contact < firstContact || (contact === firstContact &&
        (platform.y < landing.y || (platform.y === landing.y && platform.type === 'bounce')))) {
      landing = platform; firstContact = contact;
    }
  }
  return landing;
}

function bounce(p, spring, events) {
  p.y = spring.y - p.h; p.vy = -920; p.grounded = false; p.support = null;
  p.jumps = 1; p.coyote = 0; events.push({ type: 'bounce' });
}

export function stepPlayer(p, input, platforms, dt) {
  const events = [];
  dt = clamp(dt, 0, 1 / 30);
  if (dt === 0) return events;
  p.previousY = p.y;
  p.coyote = p.grounded ? PHYSICS.coyote : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jumpPressed ? PHYSICS.buffer : Math.max(0, p.jumpBuffer - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction) p.direction = direction;
  if (p.jumpBuffer > 0 && (p.coyote > 0 || p.jumps < 2)) {
    if (p.coyote > 0) p.jumps = 0;
    p.vy = -(p.jumps === 0 ? PHYSICS.jump : PHYSICS.doubleJump);
    p.jumps += 1; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0;
    events.push({ type: 'jump', double: p.jumps === 2 });
  }
  if (input.dashPressed && p.dashCooldown === 0) {
    p.dashTimer = PHYSICS.dashTime; p.dashCooldown = PHYSICS.dashCooldown; p.vy *= .25;
    events.push({ type: 'dash' });
  }
  if (p.dashTimer > 0) { p.dashTimer = Math.max(0, p.dashTimer - dt); p.vx = p.direction * PHYSICS.dashSpeed; }
  else p.vx = approach(p.vx, direction * PHYSICS.speed, (direction ? PHYSICS.acceleration : PHYSICS.friction) * dt);
  p.vy = Math.min(PHYSICS.maxFall, p.vy + PHYSICS.gravity * dt * (p.dashTimer > 0 ? .15 : 1));
  p.x += p.vx * dt;
  for (const platform of platforms) {
    if (platform.type !== 'ground' || !overlaps(p, platform)) continue;
    if (p.y + p.h <= platform.y + 2) continue;
    if (p.vx > 0) p.x = platform.x - p.w;
    else if (p.vx < 0) p.x = platform.x + platform.w;
    p.vx = 0;
  }
  const support = p.grounded && p.support;
  const carryY = support?.previousY !== undefined && p.vy >= 0 && platforms.includes(support) &&
    overlapsWidth(p, support) ? support.y - support.previousY : 0;
  const previousBottom = p.y + p.h;
  p.y += p.vy * dt + carryY;
  const landing = findLanding(p, platforms, previousBottom, p.y + p.h);
  p.grounded = false; p.support = null;
  if (landing) {
    p.y = landing.y - p.h; p.vy = 0; p.grounded = true; p.support = landing; p.jumps = 0;
    // A spring sitting a few pixels above the ground also triggers when
    // approached from the side while walking.
    const spring = landing.type === 'bounce' ? landing : platforms.find(platform => platform.type === 'bounce' && overlaps(p, platform));
    if (spring) bounce(p, spring, events);
  } else if (p.vy < 0) {
    let ceiling = -Infinity;
    for (const platform of platforms) {
      if (platform.type !== 'ground' || !overlapsWidth(p, platform)) continue;
      const underside = platform.y + platform.h;
      if (p.previousY >= underside && p.y < underside) ceiling = Math.max(ceiling, underside);
    }
    if (Number.isFinite(ceiling)) { p.y = ceiling; p.vy = 0; }
  }
  return events;
}
