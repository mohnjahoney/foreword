import type { LetterTile } from "./board"
import { TILES_PER_ROW } from "./board"
import type { WerdolPuzzle } from "./puzzle"

export interface ProposedSwap {
  firstSlot: number
  secondSlot: number
  improvement: 1 | 2
}

function expectedCharacter(puzzle: WerdolPuzzle, slotIndex: number): string | undefined {
  const rowIndex = Math.floor(slotIndex / TILES_PER_ROW)
  const row = puzzle.rows[rowIndex]
  return (rowIndex === puzzle.rows.length ? puzzle.target : row?.intendedGuess)?.[slotIndex % TILES_PER_ROW]
}

export function findNextSwap(puzzle: WerdolPuzzle, tiles: readonly LetterTile[]): ProposedSwap | undefined {
  const totalSlots = (puzzle.rows.length + 1) * TILES_PER_ROW
  const correct = (slotIndex: number): boolean => {
    const tile = tiles[slotIndex]
    return tile !== undefined && tile.letter === expectedCharacter(puzzle, slotIndex)
  }
  const correctCount = (): number => tiles.reduce((count, _tile, slotIndex) => count + (correct(slotIndex) ? 1 : 0), 0)
  const currentCorrect = correctCount()

  for (let firstSlot = 0; firstSlot < totalSlots; firstSlot += 1) {
    if (correct(firstSlot)) continue
    for (let secondSlot = firstSlot + 1; secondSlot < totalSlots; secondSlot += 1) {
      if (correct(secondSlot)) continue
      const firstTile = tiles[firstSlot]
      const secondTile = tiles[secondSlot]
      if (firstTile === undefined || secondTile === undefined) continue

      const afterSwap = [...tiles]
      afterSwap[firstSlot] = secondTile
      afterSwap[secondSlot] = firstTile
      const improvement = afterSwap.reduce((count, _tile, slotIndex) => {
        const tile = afterSwap[slotIndex]
        return count + (tile !== undefined && tile.letter === expectedCharacter(puzzle, slotIndex) ? 1 : 0)
      }, 0) - currentCorrect
      if (improvement === 2) return { firstSlot, secondSlot, improvement }
    }
  }

  const firstSlot = Array.from({ length: totalSlots }, (_value, slotIndex) => slotIndex).find((slotIndex) => !correct(slotIndex))
  if (firstSlot === undefined) return undefined
  const expectedLetter = expectedCharacter(puzzle, firstSlot)
  if (expectedLetter === undefined) return undefined
  const secondSlot = Array.from({ length: totalSlots }, (_value, slotIndex) => slotIndex).find(
    (slotIndex) => slotIndex !== firstSlot && !correct(slotIndex) && tiles[slotIndex]?.letter === expectedLetter,
  )
  if (secondSlot === undefined) return undefined
  return { firstSlot, secondSlot, improvement: 1 }
}

export function countAlgorithmicMoves(puzzle: WerdolPuzzle, startingTiles: readonly LetterTile[]): number {
  const tiles = startingTiles.map((tile) => ({ ...tile }))
  let moves = 0
  while (true) {
    const next = findNextSwap(puzzle, tiles)
    if (next === undefined) return moves
    const firstTile = tiles[next.firstSlot]
    const secondTile = tiles[next.secondSlot]
    if (firstTile === undefined || secondTile === undefined) return moves
    tiles[next.firstSlot] = secondTile
    tiles[next.secondSlot] = firstTile
    moves += 1
  }
}
