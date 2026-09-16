import { describe, expect, it } from "vitest"
import { createHeadlessGame, type HeadlessAnalyticsSink } from "./headless"

describe("headless werdol game", () => {
  it("drives real game actions and emits protocol events to a mock sink", () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = []
    const analytics: HeadlessAnalyticsSink = { track: (type, payload) => events.push({ type, payload }) }
    const game = createHeadlessGame({ randomSeed: 123456, analytics })
    const initial = game.getState()

    game.selectTile(0)
    game.selectTile(1)
    game.reset()

    expect(initial.tiles).toHaveLength(20)
    expect(game.getState().movesTaken).toBe(0)
    expect(events.map((event) => event.type)).toEqual([
      "werdol:puzzle_started",
      "werdol:move_executed",
      "werdol:puzzle_reset",
    ])
    expect(events.every((event) => event.payload.sessionId && event.payload.puzzleId && event.payload.randomSeed === 123456)).toBe(true)
    expect(events.every((event) => !Object.prototype.hasOwnProperty.call(event.payload, "seed"))).toBe(true)
  })

  it("produces the same initial state for the same random seed", () => {
    const first = createHeadlessGame({ randomSeed: 7 }).getState()
    const second = createHeadlessGame({ randomSeed: 7 }).getState()
    expect(second.tiles).toEqual(first.tiles)
    expect(second.puzzleId).not.toBe(first.puzzleId)
  })
})
