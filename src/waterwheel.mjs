export const MILL_STAMP = 'mill-stamp';

export const WATERWHEEL_SITE = Object.freeze({
  x: 849,
  wheelX: 961,
  lift: Object.freeze({ id: 'mill-lift', type: 'lift', x: 681, y: 578, w: 86, h: 22 }),
  top: 350,
  loft: Object.freeze({ id: 'mill-loft', type: 'bridge', x: 789, y: 330, w: 178, h: 22 }),
  prize: Object.freeze({ x: 886, y: 298, w: 42, h: 32 }),
});

const TRAVEL_SECONDS = 2.3, TOP_HOLD_SECONDS = 2.4, BOTTOM_HOLD_SECONDS = .9;
const smoothstep = t => t * t * (3 - 2 * t);

export function createWaterwheel(site) {
  if (!site) return null;
  return {
    site, lift: { ...site.lift, previousY: site.lift.y },
    repaired: false, collected: false, spin: 0,
    phase: 'waiting', phaseTime: 0,
  };
}

export function advanceWaterwheel(state, dt, boarded) {
  if (!state?.repaired) return;
  const { lift, site } = state;
  const bottom = site.lift.y, top = site.top;
  lift.previousY = lift.y;
  state.spin = (state.spin - dt * 1.65) % (2 * Math.PI);

  // Wait at ground level until the player lands on the lift. Give riders
  // time to step off onto the loft before automatically returning.
  if (state.phase === 'waiting') {
    if (!boarded) return;
    state.phase = 'rising';
  }
  state.phaseTime += dt;
  if (state.phase === 'at-top' || state.phase === 'at-bottom') {
    const atTop = state.phase === 'at-top';
    if (state.phaseTime >= (atTop ? TOP_HOLD_SECONDS : BOTTOM_HOLD_SECONDS)) {
      state.phase = atTop ? 'returning' : 'waiting'; state.phaseTime = 0;
    }
    return;
  }
  const progress = Math.min(1, state.phaseTime / TRAVEL_SECONDS);
  const rising = state.phase === 'rising';
  lift.y = rising ? bottom + (top - bottom) * smoothstep(progress) : top + (bottom - top) * smoothstep(progress);
  if (progress === 1) {
    state.phase = rising ? 'at-top' : 'at-bottom';
    state.phaseTime = 0;
  }
}
