import { describe, expect, it } from "vitest"
import { findNextSwap } from "./minimumMoves"
import type { ForewordPuzzle } from "./puzzle"
import type { LetterTile } from "./board"

const puzzle: ForewordPuzzle = {
  target: "CRANE",
  rows: [
    { intendedGuess: "SLATE", pattern: ["absent", "absent", "correct", "absent", "correct"] },
  ],
}

function tiles(letters: string): LetterTile[] {
  return [...letters].map((letter, id) => ({ id, letter, sourceRow: 0, sourceColumn: id }))
}

describe("findNextSwap", () => {
  it("finds a swap that fixes two positions", () => {
    const next = findNextSwap(puzzle, tiles("ELATS"))
    expect(next).toEqual({ firstSlot: 0, secondSlot: 4, improvement: 2 })
  })

  it("falls back to fixing the first unfinished position", () => {
    const next = findNextSwap(puzzle, tiles("ALTES"))
    expect(next).toEqual({ firstSlot: 0, secondSlot: 4, improvement: 1 })
  })

  it("returns no move for a solved board", () => {
    expect(findNextSwap(puzzle, tiles("SLATE"))).toBeUndefined()
  })
})
