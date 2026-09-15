import { describe, expect, it } from "vitest"
import { createScrambledBoard } from "./board"
import { createForewordPuzzle, ROW_COUNT } from "./puzzle"

describe("createScrambledBoard", () => {
  it("keeps all twenty intended letters while shuffling their positions", () => {
    const puzzle = createForewordPuzzle(() => 0.25)
    const board = createScrambledBoard(puzzle, () => 0.5)
    const intendedLetters = [...puzzle.rows.flatMap((row) => [...row.intendedGuess]), ...puzzle.target].sort()
    const scrambledLetters = board.tiles.map((tile) => tile.letter).sort()

    expect(board.rows).toHaveLength(ROW_COUNT + 1)
    expect(board.initialTiles.map((tile) => tile.letter).join("")).toBe(`${puzzle.rows.flatMap((row) => row.intendedGuess).join("")}${puzzle.target}`)
    expect(board.tiles).toHaveLength((ROW_COUNT + 1) * 5)
    expect(board.tiles.slice(ROW_COUNT * 5).map((tile) => tile.letter).join("")).toBe(puzzle.target)
    expect(board.frozenRows).toEqual([ROW_COUNT])
    expect(board.initialTiles).toHaveLength(25)
    expect(scrambledLetters).toEqual(intendedLetters)
    expect(new Set(board.tiles.map((tile) => tile.id)).size).toBe(25)
  })
})
