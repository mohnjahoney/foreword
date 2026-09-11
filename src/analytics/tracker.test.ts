import { afterEach, describe, expect, it, vi } from "vitest"
import { TRACKER_ENDPOINT, trackForewordEvent } from "./tracker"

describe("foreword analytics tracker", () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ["foreword:session_started", { platform: "web" }],
    ["foreword:puzzle_started", { puzzleId: "puzzle-1", randomSeed: 123456 }],
    ["foreword:move_executed", { puzzleId: "puzzle-1", moveNumber: 1, firstSlot: 0, secondSlot: 1 }],
    ["foreword:puzzle_reset", { puzzleId: "puzzle-1", movesTaken: 3 }],
    ["foreword:puzzle_ended", { puzzleId: "puzzle-1", outcome: "solved", movesTaken: 4 }],
  ])("posts %s in the receiver protocol envelope", (event, details) => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal("fetch", fetchMock)

    trackForewordEvent(event, details)

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]).toBe(TRACKER_ENDPOINT)
    expect(calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    })

    const request = JSON.parse(String(calls[0]?.[1].body))
    expect(request).toEqual({ events: [expect.objectContaining({
      id: expect.any(String),
      projectId: "foreword",
      source: "foreword",
      type: event,
      time: expect.stringMatching(/^2026-/),
      payload: { sessionId: expect.any(String), ...details },
    })] })
    expect(request.events[0]).not.toHaveProperty("seed")
    expect(request.events[0].payload).not.toHaveProperty("seed")
  })
})
