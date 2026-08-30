import { describe, expect, it } from "vitest"
import { createTimelineRects, DEFAULT_MAGNIFICATION_CONFIG, influenceAt, layoutTimelineRects, timelineScaleForStateCount, timelineWidthForStateCount, widthAt } from "./reviewTimeline"

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
    expect(widthAt("state", 1, DEFAULT_MAGNIFICATION_CONFIG)).toBe(DEFAULT_MAGNIFICATION_CONFIG.focusedWidth)
    expect(widthAt("transition", 1, DEFAULT_MAGNIFICATION_CONFIG)).toBe(DEFAULT_MAGNIFICATION_CONFIG.focusedWidth)
  })

  it("uses the longer path to establish a shared base tile scale", () => {
    const scale = timelineScaleForStateCount(8, 344)
    const longWidth = timelineWidthForStateCount(8, scale)
    const shortWidth = timelineWidthForStateCount(5, scale)
    expect(longWidth).toBeLessThanOrEqual(344)
    expect(shortWidth).toBeLessThan(longWidth)
  })
})
