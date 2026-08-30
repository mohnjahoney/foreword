import type { TimelineRect } from "./reviewTimeline"

export interface ReviewCardRect extends TimelineRect {
  cardIndex: number
}

export interface ReviewCardLayout extends ReviewCardRect {
  left: number
  right: number
  width: number
  center: number
  verticalInfluence: number
}

export interface ReviewCardConfig {
  cardWidth: number
  maxSpacing: number
  adjacentSpacing: number
  restSpacing: number
  verticalLift: number
}

export const DEFAULT_REVIEW_CARD_CONFIG: ReviewCardConfig = {
  cardWidth: 30,
  maxSpacing: 34,
  adjacentSpacing: 17,
  restSpacing: 0,
  verticalLift: 8,
}

export function cardWidthForPath(cardCount: number, maxWidth: number, config = DEFAULT_REVIEW_CARD_CONFIG): number {
  if (cardCount <= 0) return config.cardWidth
  return Math.min(config.cardWidth, maxWidth)
}

export function createReviewCardRects(
  stateCount: number,
  left: number,
  right: number,
  config = DEFAULT_REVIEW_CARD_CONFIG,
): ReviewCardRect[] {
  const cardCount = Math.max(0, stateCount * 2 - 1)
  if (cardCount === 0) return []
  const cardWidth = Math.min(config.cardWidth, right - left)
  const restSpacing = Math.min(cardWidth * 0.48, cardCount === 1 ? 0 : (right - left - cardWidth) / (cardCount - 1))
  const totalWidth = cardWidth + Math.max(0, cardCount - 1) * restSpacing
  let cursor = right - totalWidth
  const rects: ReviewCardRect[] = []
  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    const type = cardIndex % 2 === 0 ? "state" : "transition"
    rects.push({ type, index: type === "state" ? cardIndex / 2 : (cardIndex - 1) / 2, cardIndex, baseLeft: cursor, baseRight: cursor + cardWidth })
    cursor += cardWidth
    if (cardIndex < cardCount - 1) cursor += restSpacing
  }
  return rects
}

export function restFocusX(rects: readonly ReviewCardRect[], focusCardIndex: number): number | undefined {
  const rect = rects.find((candidate) => candidate.cardIndex === focusCardIndex)
  return rect === undefined ? undefined : (rect.baseLeft + rect.baseRight) / 2
}

export function layoutReviewCards(
  rects: readonly ReviewCardRect[],
  focusCardIndex: number,
  pointerX: number | undefined,
  left: number,
  right: number,
  config = DEFAULT_REVIEW_CARD_CONFIG,
): ReviewCardLayout[] {
  if (rects.length === 0) return []
  const focus = Math.max(0, Math.min(rects.length - 1, focusCardIndex))
  const cardWidth = rects[0]!.baseRight - rects[0]!.baseLeft
  if (pointerX === undefined) {
    return rects.map((rect) => ({ ...rect, left: rect.baseLeft, right: rect.baseRight, width: cardWidth, center: (rect.baseLeft + rect.baseRight) / 2, verticalInfluence: 0 }))
  }
  const focusX = pointerX ?? restFocusX(rects, focus) ?? (left + right) / 2
  const rawGaps = rects.slice(0, -1).map((_rect, index) => gapForBoundary(index, focus, config))
  const focusGapTotal = rawGaps.reduce((total, gap, index) => total + (isFocusGap(index, focus) ? gap : 0), 0)
  const nonFocusGapCount = rawGaps.filter((_gap, index) => !isFocusGap(index, focus)).length
  const availableSpan = right - left - cardWidth
  const nonFocusGap = Math.min(config.restSpacing || deriveRestSpacing(rects), nonFocusGapCount === 0 ? 0 : Math.max(0, (availableSpan - focusGapTotal) / nonFocusGapCount))
  const gaps = rawGaps.map((gap, index) => isFocusGap(index, focus) ? gap : nonFocusGap)
  const positions = new Array<number>(rects.length)
  positions[focus] = focusX - cardWidth / 2
  for (let index = focus - 1; index >= 0; index -= 1) positions[index] = positions[index + 1]! - gaps[index]! - cardWidth
  for (let index = focus + 1; index < rects.length; index += 1) positions[index] = positions[index - 1]! + cardWidth + gaps[index - 1]!
  const minShift = left - positions[0]!
  const maxShift = right - (positions.at(-1)! + cardWidth)
  const shift = Math.max(minShift, Math.min(maxShift, 0))
  return rects.map((rect, index) => {
    const cardLeft = positions[index]! + shift
    const distance = Math.abs(index - focus)
    return { ...rect, left: cardLeft, right: cardLeft + cardWidth, width: cardWidth, center: cardLeft + cardWidth / 2, verticalInfluence: distance === 0 ? 1 : distance === 1 ? 0.45 : 0 }
  })
}

export function nearestReviewCardIndex(rects: readonly ReviewCardRect[], x: number): number {
  return rects.reduce((nearest, rect, index) => {
    const nearestDistance = Math.abs((rects[nearest]!.baseLeft + rects[nearest]!.baseRight) / 2 - x)
    const distance = Math.abs((rect.baseLeft + rect.baseRight) / 2 - x)
    return distance < nearestDistance ? index : nearest
  }, 0)
}

function gapForBoundary(index: number, focus: number, config: ReviewCardConfig): number {
  if (isFocusGap(index, focus)) return config.maxSpacing
  if (Math.abs(index - focus) === 1 || Math.abs(index + 1 - focus) === 1) return config.adjacentSpacing
  return config.restSpacing
}

function isFocusGap(index: number, focus: number): boolean {
  return index === focus - 1 || index === focus
}

function deriveRestSpacing(rects: readonly ReviewCardRect[]): number {
  if (rects.length < 2) return 0
  return Math.max(0, rects[1]!.baseLeft - rects[0]!.baseRight)
}
