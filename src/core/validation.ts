import { countCompleteSolutions } from "./solver"
import { createForewordPuzzle } from "./puzzle"
import { ALLOWED_WORDS } from "./words"
import type { ForewordPuzzle } from "./puzzle"

export interface PuzzleAssessment {
  solutionCount: number
  acceptable: boolean
}

export function assessPuzzle(
  puzzle: ForewordPuzzle,
  words: readonly string[] = ALLOWED_WORDS,
): PuzzleAssessment {
  const solutionCount = countCompleteSolutions(puzzle, 3, words)
  return { solutionCount, acceptable: solutionCount > 0 && solutionCount <= 2 }
}

export function createValidatedPuzzle(
  random = Math.random,
  maxAttempts = 20,
): ForewordPuzzle {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const puzzle = createForewordPuzzle(random)
    if (assessPuzzle(puzzle).acceptable) return puzzle
  }
  throw new Error(`Could not create an acceptable puzzle in ${maxAttempts} attempts`)
}
