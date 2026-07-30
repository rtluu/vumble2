/** Reddit's epoch, kept as the origin so hot_rank values stay small and comparable. */
const EPOCH_MS = Date.UTC(2005, 11, 8, 7, 46, 43);

/** Seconds of age that offset one order of magnitude of score. */
const DECAY_SECONDS = 45000;

/**
 * Baseline hot rank: `log10(score) + sign · age / 45000`.
 *
 * The plan (§6) layers watch-through rate, discussion depth, and voter
 * diversity on top of this. Those need traffic to mean anything, so they
 * arrive once there is traffic to measure — this is the floor, not the
 * finished ranking.
 */
export function hotRank(score: number, createdAt: Date): number {
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = (createdAt.getTime() - EPOCH_MS) / 1000;
  return Number((order + (sign * seconds) / DECAY_SECONDS).toFixed(7));
}
