export const SEED_LIMIT = 1_000_000

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0
  return ((Math.trunc(seed) % SEED_LIMIT) + SEED_LIMIT) % SEED_LIMIT
}

export function seedFromCurrentTime(date = new Date()): number {
  return date.getHours() * 10_000 + date.getMinutes() * 100 + date.getSeconds()
}

export function nextPuzzleSeed(seed: number, wordListLength: number): number {
  if (!Number.isInteger(wordListLength) || wordListLength <= 0) return normalizeSeed(seed)
  return ((Math.trunc(seed) * 17 - 3) % wordListLength + wordListLength) % wordListLength
}

export function createSeededRandom(seed: number, stream = 0): () => number {
  let state = (normalizeSeed(seed) + 1 + stream * 1009) >>> 0
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}
