import { describe, expect, it } from "vitest"
import { createEventEnvelope } from "./protocol"

describe("analytics protocol adapter", () => {
  it("creates the receiver-compatible event envelope for any project", () => {
    expect(createEventEnvelope({
      id: "event-1",
      projectId: "foreword",
      source: "foreword",
      type: "foreword:puzzle_started",
      time: "2026-09-11T12:00:00.000Z",
      payload: { sessionId: "session-1", seed: 123456 },
    })).toEqual({
      id: "event-1",
      projectId: "foreword",
      source: "foreword",
      type: "foreword:puzzle_started",
      time: "2026-09-11T12:00:00.000Z",
      payload: { sessionId: "session-1", seed: 123456 },
    })
  })
})
