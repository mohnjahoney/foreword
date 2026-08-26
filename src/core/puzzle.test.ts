import { describe, expect, it } from "vitest"
import { createForewordPuzzle, ROW_COUNT } from "./puzzle"
import { evaluateGuess } from "./evaluateGuess"

describe("createForewordPuzzle", () => {
  it("creates four intended guesses with matching evaluations", () => {
    const puzzle = createForewordPuzzle(() => 0.25)
    expect(puzzle.target).toHaveLength(5)
    expect(puzzle.rows).toHaveLength(ROW_COUNT)
    puzzle.rows.forEach((row) => {
      expect(evaluateGuess(row.intendedGuess, puzzle.target)).toEqual(row.pattern)
    })
  })
})
