/** 16:9, expressed as height/width — the reference shape the player is built around. */
const WIDESCREEN = 0.5625;

/**
 * Anything taller than this is treated as vertical and gets letterbox
 * compensation. V1 used 0.57 (Player.js:722) — a hair above 16:9, so that
 * rounding noise in reported dimensions doesn't trip the vertical path.
 */
const VERTICAL_THRESHOLD = 0.57;

/** Cap for ratios past square, so very tall clips don't push the frame off-screen. */
const MAX_TRANSFORM = 37.5;

export interface AspectFit {
  isVertical: boolean;
  /** Vertical inset as a percentage, applied by the player frame. */
  transform: number;
}

/**
 * Decide how a source's native dimensions sit inside the player frame.
 *
 * Ported from the inline ratio branches in Player.js (:719-725, :756-762),
 * which ran identically in the Reddit and Gfycat paths.
 */
export function fitAspect(
  height: number | null | undefined,
  width: number | null | undefined,
): AspectFit {
  if (!height || !width || height <= 0 || width <= 0) {
    return { isVertical: false, transform: 0 };
  }

  const ratio = height / width;

  if (ratio > 1) {
    return { isVertical: true, transform: MAX_TRANSFORM };
  }

  if (ratio > VERTICAL_THRESHOLD) {
    return { isVertical: true, transform: ((ratio - WIDESCREEN) / 2) * 100 };
  }

  return { isVertical: false, transform: 0 };
}
