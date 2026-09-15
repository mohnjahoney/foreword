import { ROW_COUNT, type ForewordPuzzle, type ForewordRow } from "./puzzle"

export const TILES_PER_ROW = 5

export interface LetterTile {
  id: number
  letter: string
  sourceRow: number
  sourceColumn: number
}

export interface ScrambledBoard {
  rows: ForewordRow[]
  initialTiles: LetterTile[]
  tiles: LetterTile[]
  frozenRows: number[]
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

  const targetTiles = [...puzzle.target].map((letter, sourceColumn) => ({
    id: ROW_COUNT * TILES_PER_ROW + sourceColumn,
    letter,
    sourceRow: ROW_COUNT,
    sourceColumn,
  }))

  const boardRows: ForewordRow[] = [
    ...puzzle.rows,
    { intendedGuess: puzzle.target, pattern: Array(5).fill("correct") },
  ]

  return {
    rows: boardRows,
    initialTiles: [...tiles, ...targetTiles],
    tiles: [...shuffled(tiles, random), ...targetTiles],
    frozenRows: [ROW_COUNT],
  }
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
