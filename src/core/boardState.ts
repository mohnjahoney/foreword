import type { Letter, LetterTile } from "./board"
import type { WerdolPuzzle } from "./puzzle"
import { TILES_PER_ROW } from "./board"

export function swapOccupancy(occupancy: readonly number[], firstSlot: number, secondSlot: number): number[] {
  const next = [...occupancy]
  const first = next[firstSlot]
  const second = next[secondSlot]
  if (first === undefined || second === undefined) return next
  next[firstSlot] = second
  next[secondSlot] = first
  return next
}

export function tilesFromOccupancy(occupancy: readonly number[], letters: readonly Letter[]): LetterTile[] {
  return occupancy.flatMap((letterId) => {
    const letter = letters[letterId]
    return letter === undefined ? [] : [{
      id: letter.id,
      letter: letter.character,
      sourceRow: letter.sourceRow,
      sourceColumn: letter.sourceColumn,
    }]
  })
}

export function isLetterCorrectAtSlot(
  puzzle: WerdolPuzzle,
  occupancy: readonly number[],
  letters: readonly Letter[],
  slotIndex: number,
): boolean {
  const letterId = occupancy[slotIndex]
  const letter = letterId === undefined ? undefined : letters[letterId]
  const rowIndex = Math.floor(slotIndex / TILES_PER_ROW)
  const row = puzzle.rows[rowIndex]
  const target = rowIndex === puzzle.rows.length ? puzzle.target : row?.intendedGuess
  return letter !== undefined && target?.[slotIndex % TILES_PER_ROW] === letter.character
}

export function countCorrectOccupancy(
  puzzle: WerdolPuzzle,
  occupancy: readonly number[],
  letters: readonly Letter[],
): number {
  return occupancy.reduce((count, _letterId, slotIndex) => count + (
    isLetterCorrectAtSlot(puzzle, occupancy, letters, slotIndex) ? 1 : 0
  ), 0)
}
