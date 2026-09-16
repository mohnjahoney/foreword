import { ROW_COUNT, type ForewordPuzzle, type ForewordRow } from "./puzzle"

export const TILES_PER_ROW = 5

export interface Letter {
  id: number
  character: string
  sourceRow: number
  sourceColumn: number
}

export interface Tile {
  id: number
  row: number
  column: number
  occupyingLetterId: number
  targetCharacter: string
}

export interface LetterTile {
  id: number
  letter: string
  sourceRow: number
  sourceColumn: number
}

export interface ScrambledBoard {
  rows: ForewordRow[]
  letters: Letter[]
  boardTiles: Tile[]
  initialOccupancy: number[]
  occupancy: number[]
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

  const letters = puzzle.rows.flatMap((row, sourceRow) =>
    [...row.intendedGuess].map((letter, sourceColumn) => ({
      id: sourceRow * TILES_PER_ROW + sourceColumn,
      character: letter,
      sourceRow,
      sourceColumn,
    })),
  )

  const targetLetters = [...puzzle.target].map((letter, sourceColumn) => ({
    id: ROW_COUNT * TILES_PER_ROW + sourceColumn,
    character: letter,
    sourceRow: ROW_COUNT,
    sourceColumn,
  }))
  const allLetters = [...letters, ...targetLetters]

  const boardRows: ForewordRow[] = [
    ...puzzle.rows,
    { intendedGuess: puzzle.target, pattern: Array(5).fill("correct") },
  ]

  const boardTiles = boardRows.flatMap((row, rowIndex) =>
    [...row.intendedGuess].map((targetCharacter, column) => ({
      id: rowIndex * TILES_PER_ROW + column,
      row: rowIndex,
      column,
      occupyingLetterId: rowIndex * TILES_PER_ROW + column,
      targetCharacter,
    })),
  )
  const shuffledTiles = shuffled(letters, random)
  const initialOccupancy = boardTiles.map((tile) => tile.occupyingLetterId)
  const occupancy = [...shuffledTiles.map((letter) => letter.id), ...targetLetters.map((letter) => letter.id)]
  const initialTiles: LetterTile[] = allLetters.map((letter) => ({
    id: letter.id,
    letter: letter.character,
    sourceRow: letter.sourceRow,
    sourceColumn: letter.sourceColumn,
  }))

  return {
    rows: boardRows,
    letters: allLetters,
    boardTiles,
    initialOccupancy,
    occupancy,
    initialTiles,
    tiles: [...shuffledTiles, ...targetLetters].map((letter) => ({
      id: letter.id,
      letter: letter.character,
      sourceRow: letter.sourceRow,
      sourceColumn: letter.sourceColumn,
    })),
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
