/** Canvas rendering for the learner's original Quest pet atlas. */
export const ANIMATIONS = Object.freeze({
  idle: Object.freeze({ row: 0, frames: 6, fps: 5, loop: true }),
  run: Object.freeze({ row: 1, leftRow: 2, frames: 8, fps: 12, loop: true }),
  jump: Object.freeze({ row: 4, frames: 3, fps: 12, loop: false }),
  fall: Object.freeze({ row: 4, startFrame: 3, frames: 2, fps: 7, loop: false }),
  dash: Object.freeze({ row: 1, leftRow: 2, frames: 8, fps: 20, loop: true }),
  hurt: Object.freeze({ row: 5, frames: 8, fps: 10, loop: false }),
  celebrate: Object.freeze({ row: 3, frames: 4, fps: 7, loop: true }),
  think: Object.freeze({ row: 7, frames: 6, fps: 5, loop: true }),
});

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const ATLAS_WIDTH = 1536;
const ATLAS_HEIGHT = 2288;

// Alpha bounds verified against the unchanged source PNG. Keeping a common
// horizontal origin avoids frame jitter; feet follow each pose's bottom edge.
const FOOT_ANCHORS = Object.freeze({
  0: [200, 200, 200, 200, 199, 200],
  1: [200, 200, 200, 200, 200, 200, 200, 200],
  2: [200, 198, 199, 200, 200, 198, 199, 200],
  3: [199, 199, 199, 199],
  4: [200, 187, 152, 194, 200],
  5: [200, 200, 200, 200, 200, 200, 200, 200],
  7: [199, 199, 199, 199, 199, 199],
});

export class SpriteAtlas {
  constructor(image) {
    this.image = image;
  }

  /**
   * Draw above a gameplay body (x/y/width/height), with feet at its bottom.
   * direction: -1 left, 1 right. time: seconds elapsed in this animation.
   * An upright Quest fills the supplied body height; the sword may extend
   * beyond its width. No physical movement is applied by this renderer.
   */
  draw(ctx, { x, y, width, height, direction = 1, state = 'idle', time = 0, alpha = 1 }) {
    if (!(width > 0 && height > 0)) return;

    ctx.save();
    ctx.globalAlpha *= Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
    ctx.imageSmoothingEnabled = false;

    const imageWidth = this.image?.naturalWidth ?? this.image?.width ?? 0;
    const imageHeight = this.image?.naturalHeight ?? this.image?.height ?? 0;
    if (this.image?.complete === false || imageWidth < ATLAS_WIDTH || imageHeight < ATLAS_HEIGHT) {
      // The level stays playable while its PNG loads or if the asset is absent.
      ctx.fillStyle = '#40d9cb';
      ctx.fillRect(x + width * 0.2, y + height * 0.2, width * 0.6, height * 0.8);
      ctx.fillStyle = '#153e46';
      ctx.fillRect(x + width * 0.35, y + height * 0.35, width * 0.1, height * 0.08);
      ctx.fillRect(x + width * 0.55, y + height * 0.35, width * 0.1, height * 0.08);
      ctx.restore();
      return;
    }

    const animation = ANIMATIONS[state] ?? ANIMATIONS.idle;
    const tick = Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) * animation.fps);
    const frame = (animation.startFrame ?? 0) + (animation.loop
      ? tick % animation.frames
      : Math.min(tick, animation.frames - 1));
    const facesLeft = direction < 0;
    const hasLeftRow = Number.isInteger(animation.leftRow);
    const row = facesLeft && hasLeftRow ? animation.leftRow : animation.row;
    const foot = FOOT_ANCHORS[row]?.[frame] ?? 200;
    const scale = height / 156;

    ctx.translate(x + width / 2, y + height);
    if (facesLeft && !hasLeftRow) ctx.scale(-1, 1);

    // Only sample within this cell. The trim includes all verified poses,
    // including the highest jump, but leaves transparent atlas guard pixels.
    ctx.drawImage(
      this.image,
      frame * CELL_WIDTH + 24, row * CELL_HEIGHT + 2, 144, 200,
      -72 * scale, (2 - foot) * scale, 144 * scale, 200 * scale,
    );
    ctx.restore();
  }
}
