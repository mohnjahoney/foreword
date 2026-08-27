import { describe, expect, it } from "vitest"
import { assessPuzzle, countBoardTiles } from "./validation"
import { type ForewordPuzzle } from "./puzzle"

describe("assessPuzzle", () => {
  it("accepts a puzzle with one complete solution", () => {
    const puzzle: ForewordPuzzle = {
      target: "CRANE",
      rows: [
        { intendedGuess: "SLATE", pattern: ["absent", "absent", "correct", "absent", "correct"] },
        { intendedGuess: "CRANE", pattern: ["correct", "correct", "correct", "correct", "correct"] },
        { intendedGuess: "MOUND", pattern: ["absent", "absent", "absent", "correct", "absent"] },
        { intendedGuess: "BIGHT", pattern: ["absent", "absent", "absent", "absent", "absent"] },
      ],
    }

    expect(assessPuzzle(puzzle, ["SLATE", "CRANE", "MOUND", "BIGHT"])).toEqual({
      solutionCount: 1,
      acceptable: true,
    })
  })
})

describe("countBoardTiles", () => {
  it("counts green and yellow tiles across the whole board", () => {
    const puzzle: ForewordPuzzle = {
      target: "CRANE",
      rows: [
        { intendedGuess: "SLATE", pattern: ["absent", "present", "correct", "absent", "correct"] },
        { intendedGuess: "MOUND", pattern: ["present", "absent", "absent", "correct", "absent"] },
      ],
    }

    expect(countBoardTiles(puzzle)).toEqual({ green: 3, yellow: 2 })
  })
})
