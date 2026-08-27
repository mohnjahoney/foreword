import { countCompleteSolutions } from "./solver"
import { createForewordPuzzle } from "./puzzle"
import { ALLOWED_WORDS } from "./words"
import type { ForewordPuzzle } from "./puzzle"
import type { LetterResult } from "./evaluateGuess"

export interface PuzzleAssessment {
  solutionCount: number
  acceptable: boolean
}

export interface BoardTileCounts {
  green: number
  yellow: number
}

export function countBoardTiles(puzzle: ForewordPuzzle): BoardTileCounts {
  return puzzle.rows.reduce(
    (counts, row) => {
      row.pattern.forEach((result: LetterResult) => {
        if (result === "correct") counts.green += 1
        if (result === "present") counts.yellow += 1
      })
      return counts
    },
    { green: 0, yellow: 0 },
  )
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
