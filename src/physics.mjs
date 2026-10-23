export const PHYSICS = Object.freeze({ speed: 330, acceleration: 2600, friction: 2200, gravity: 1700, jump: 650, doubleJump: 610, dashSpeed: 820, dashTime: .145, dashCooldown: .78, maxFall: 1100, coyote: .11, buffer: .13 });
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function approach(value, target, amount) { return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target); }
export function createPlayer(spawn = { x: 90, y: 520 }) { return { x: spawn.x, y: spawn.y, w: 34, h: 56, vx: 0, vy: 0, direction: 1, grounded: false, jumps: 0, coyote: 0, jumpBuffer: 0, dashTimer: 0, dashCooldown: 0, invulnerable: 0, previousY: spawn.y }; }

export function stepPlayer(p, input, platforms, dt) {
  const events = [];
  dt = clamp(dt, 0, 1 / 30);
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
  const previousBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const platform of platforms) {
    if (p.x + p.w <= platform.x || p.x >= platform.x + platform.w) continue;
    if (p.vy >= 0 && previousBottom <= platform.y + 2 && p.y + p.h >= platform.y) {
      p.y = platform.y - p.h; p.vy = 0; p.grounded = true; p.jumps = 0;
      if (platform.type === 'bounce') { p.vy = -920; p.grounded = false; p.jumps = 1; events.push({ type: 'bounce' }); }
    } else if (p.vy < 0 && platform.type === 'ground' && p.previousY >= platform.y + platform.h && p.y < platform.y + platform.h) {
      p.y = platform.y + platform.h; p.vy = 0;
    }
  }
  if (p.grounded) {
    const spring = platforms.find(platform => platform.type === 'bounce' && overlaps(p, platform));
    if (spring) { p.y = spring.y - p.h; p.vy = -920; p.grounded = false; p.jumps = 1; events.push({ type: 'bounce' }); }
  }
  return events;
}
