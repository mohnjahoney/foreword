import { describe, expect, it } from "vitest"
import { createTimelineRects, influenceAt, layoutTimelineRects, widthAt } from "./reviewTimeline"

describe("review timeline magnification", () => {
  it("uses a smooth influence field", () => {
    expect(influenceAt(10, 10, 30)).toBe(1)
    expect(influenceAt(40, 10, 30)).toBe(0)
    expect(influenceAt(25, 10, 30)).toBeCloseTo(0.5)
  })

  it("keeps rectangles consecutive in both modes", () => {
    const base = createTimelineRects(5, 30, 370)
    for (const mode of ["center", "continuous"] as const) {
      const layout = layoutTimelineRects(base, 145, 30, 400, mode)
      layout.slice(1).forEach((rect, index) => expect(rect.left).toBeCloseTo(layout[index]!.right))
    }
  })

  it("makes a state and transition converge near focus", () => {
    const base = createTimelineRects(2, 30, 370)
    const layout = layoutTimelineRects(base, 32, 30, 400, "center")
    expect(layout[0]!.width).toBeGreaterThan(4)
    expect(widthAt("state", 1, { radius: 30, restStateWidth: 4, restTransitionWidth: 24, focusedWidth: 18, baseHeight: 14, maxHeightScale: 2.2, maxVerticalDisplacement: 16, smoothing: 0.22 })).toBe(18)
    expect(widthAt("transition", 1, { radius: 30, restStateWidth: 4, restTransitionWidth: 24, focusedWidth: 18, baseHeight: 14, maxHeightScale: 2.2, maxVerticalDisplacement: 16, smoothing: 0.22 })).toBe(18)
  })
})
