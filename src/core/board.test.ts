import { describe, expect, it } from "vitest"
import { createScrambledBoard } from "./board"
import { createForewordPuzzle, ROW_COUNT } from "./puzzle"

describe("createScrambledBoard", () => {
  it("keeps all twenty intended letters while shuffling their positions", () => {
    const puzzle = createForewordPuzzle(() => 0.25)
    const board = createScrambledBoard(puzzle, () => 0.5)
    const intendedLetters = puzzle.rows.flatMap((row) => [...row.intendedGuess]).sort()
    const scrambledLetters = board.tiles.map((tile) => tile.letter).sort()

    expect(board.rows).toBe(puzzle.rows)
    expect(board.tiles).toHaveLength(ROW_COUNT * 5)
    expect(scrambledLetters).toEqual(intendedLetters)
    expect(new Set(board.tiles.map((tile) => tile.id)).size).toBe(20)
  })
})
