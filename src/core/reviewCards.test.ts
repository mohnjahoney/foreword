import { describe, expect, it } from "vitest"
import { createReviewCardRects, layoutReviewCards } from "./reviewCards"

describe("review card layout", () => {
  it("overlaps cards at rest and stays inside the strip", () => {
    const rects = createReviewCardRects(5, 43, 387)
    expect(rects[1]!.baseLeft).toBeLessThan(rects[0]!.baseRight)
    expect(rects[0]!.baseLeft).toBeGreaterThanOrEqual(43)
    expect(rects.at(-1)!.baseRight).toBeLessThanOrEqual(387)
  })

  it("exposes the focused card without spilling past the endpoints", () => {
    const rects = createReviewCardRects(5, 43, 387)
    const layout = layoutReviewCards(rects, 4, 220, 43, 387)
    expect(layout[4]!.center).toBeCloseTo(220)
    expect(layout[4]!.left).toBeGreaterThanOrEqual(43)
    expect(layout.at(-1)!.right).toBeLessThanOrEqual(387)
    expect(layout[3]!.right).toBeLessThanOrEqual(layout[4]!.left)
  })
})
