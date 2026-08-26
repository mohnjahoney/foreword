import { ROW_COUNT, type ForewordPuzzle } from "./puzzle"

export const TILES_PER_ROW = 5

export interface LetterTile {
  id: number
  letter: string
  sourceRow: number
  sourceColumn: number
}

export interface ScrambledBoard {
  rows: ForewordPuzzle["rows"]
  tiles: LetterTile[]
}

export function createScrambledBoard(
  puzzle: ForewordPuzzle,
  random = Math.random,
): ScrambledBoard {
  if (puzzle.rows.length !== ROW_COUNT) {
    throw new Error(`Foreword boards must contain exactly ${ROW_COUNT} rows`)
  }

  const tiles = puzzle.rows.flatMap((row, sourceRow) =>
    [...row.intendedGuess].map((letter, sourceColumn) => ({
      id: sourceRow * TILES_PER_ROW + sourceColumn,
      letter,
      sourceRow,
      sourceColumn,
    })),
  )

  return { rows: puzzle.rows, tiles: shuffled(tiles, random) }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex] as T
    result[swapIndex] = current as T
  }
  return result
}
