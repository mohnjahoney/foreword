import { describe, expect, it } from "vitest"
import { evaluateGuess } from "./evaluateGuess"

describe("evaluateGuess", () => {
  it("handles exact, present, and absent letters", () => {
    expect(evaluateGuess("CRANE", "REACT")).toEqual([
      "present", "present", "correct", "absent", "present",
    ])
  })

  it("handles repeated letters with Wordle rules", () => {
    expect(evaluateGuess("APPLE", "ALERT")).toEqual([
      "correct", "absent", "absent", "present", "present",
    ])
  })
})
