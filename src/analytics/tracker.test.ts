import { afterEach, describe, expect, it, vi } from "vitest"
import { TRACKER_ENDPOINT, trackForewordEvent } from "./tracker"

describe("Foreword analytics tracker", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("posts structured events to the analysis endpoint", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal("fetch", fetchMock)

    trackForewordEvent("foreword:puzzle_started", { seed: 123456, wordListMode: "easy" })

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]).toBe(TRACKER_ENDPOINT)
    expect(JSON.parse(String(calls[0]?.[1].body))).toMatchObject({
      event: "foreword:puzzle_started",
      message: "foreword:puzzle_started",
      seed: 123456,
      wordListMode: "easy",
    })
  })
})
