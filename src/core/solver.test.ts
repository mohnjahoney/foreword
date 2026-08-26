import { describe, expect, it } from "vitest"
import { countCompleteSolutions } from "./solver"
import { type ForewordPuzzle } from "./puzzle"

describe("countCompleteSolutions", () => {
  it("finds the intended board solution", () => {
    const puzzle: ForewordPuzzle = {
      target: "CRANE",
      rows: [
        { intendedGuess: "SLATE", pattern: ["absent", "absent", "correct", "absent", "correct"] },
        { intendedGuess: "CRANE", pattern: ["correct", "correct", "correct", "correct", "correct"] },
        { intendedGuess: "MOUND", pattern: ["absent", "absent", "absent", "correct", "absent"] },
        { intendedGuess: "BIGHT", pattern: ["absent", "absent", "absent", "absent", "absent"] },
      ],
    }

    expect(countCompleteSolutions(puzzle, 1, ["SLATE", "CRANE", "MOUND", "BIGHT"])).toBe(1)
  })

  it("stops counting once the requested limit is reached", () => {
    const puzzle: ForewordPuzzle = {
      target: "CRANE",
      rows: [
        { intendedGuess: "CRANE", pattern: ["correct", "correct", "correct", "correct", "correct"] },
        { intendedGuess: "SLATE", pattern: ["absent", "absent", "correct", "absent", "correct"] },
        { intendedGuess: "MOUND", pattern: ["absent", "absent", "absent", "correct", "absent"] },
        { intendedGuess: "BIGHT", pattern: ["absent", "absent", "absent", "absent", "absent"] },
      ],
    }
    expect(countCompleteSolutions(puzzle, 0, [])).toBe(0)
  })
})
