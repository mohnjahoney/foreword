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

  it("can require every row to share a target letter", () => {
    const puzzle = createForewordPuzzle(() => 0.25, { requireTargetLetterInEachRow: true })
    puzzle.rows.forEach((row) => {
      expect(row.pattern.some((result) => result !== "absent")).toBe(true)
    })
  })

  it("can require every row to have a green tile", () => {
    const puzzle = createForewordPuzzle(() => 0.25, { requireGreenTileInEachRow: true })
    puzzle.rows.forEach((row) => {
      expect(row.pattern.some((result) => result === "correct")).toBe(true)
    })
  })

  it("can draw rows from the smaller answer-word list", () => {
    const puzzle = createForewordPuzzle(() => 0.25, { useAnswerWordsForRows: true })
    expect(puzzle.rows).toHaveLength(ROW_COUNT)
  })
})
