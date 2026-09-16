import type { LetterTile } from "./board"
import { TILES_PER_ROW } from "./board"
import type { WerdolPuzzle } from "./puzzle"
import { findNextSwap } from "./minimumMoves"

export interface ReviewState {
  tiles: LetterTile[]
  deltaCorrect: number
  correctCount: number
  swap?: { firstSlot: number; secondSlot: number }
}

export function countCorrectTiles(puzzle: WerdolPuzzle, tiles: readonly LetterTile[]): number {
  return tiles.reduce((count, tile, slotIndex) => {
    const rowIndex = Math.floor(slotIndex / TILES_PER_ROW)
    const row = puzzle.rows[rowIndex]
    const target = rowIndex === puzzle.rows.length ? puzzle.target : row?.intendedGuess
    return count + (target?.[slotIndex % TILES_PER_ROW] === tile.letter ? 1 : 0)
  }, 0)
}

export function swapTileState(tiles: readonly LetterTile[], firstSlot: number, secondSlot: number): LetterTile[] {
  const next = tiles.map((tile) => ({ ...tile }))
  const first = next[firstSlot]
  const second = next[secondSlot]
  if (first === undefined || second === undefined) return next
  next[firstSlot] = second
  next[secondSlot] = first
  return next
}

export function createReferencePath(puzzle: WerdolPuzzle, startingTiles: readonly LetterTile[]): ReviewState[] {
  const states: ReviewState[] = [{ tiles: startingTiles.map((tile) => ({ ...tile })), deltaCorrect: 0, correctCount: countCorrectTiles(puzzle, startingTiles) }]
  let tiles = states[0]!.tiles
  const maxMoves = (puzzle.rows.length + 1) * TILES_PER_ROW

  for (let move = 0; move < maxMoves; move += 1) {
    const swap = findNextSwap(puzzle, tiles)
    if (swap === undefined) break
    const nextTiles = swapTileState(tiles, swap.firstSlot, swap.secondSlot)
    const currentCorrect = countCorrectTiles(puzzle, tiles)
    const nextCorrect = countCorrectTiles(puzzle, nextTiles)
    states.push({ tiles: nextTiles, deltaCorrect: nextCorrect - currentCorrect, correctCount: nextCorrect, swap })
    tiles = nextTiles
  }

  return states
}
