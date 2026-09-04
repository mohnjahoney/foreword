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
  verticalLift: number
  sideMargin: number
}

export const DEFAULT_REVIEW_CARD_CONFIG: ReviewCardConfig = {
  cardWidth: 30,
  verticalLift: 8,
  sideMargin: 12,
}

export function cardWidthForPath(_cardCount: number, maxWidth: number, config = DEFAULT_REVIEW_CARD_CONFIG): number {
  const cardCount = Math.max(1, _cardCount)
  const widthThatPreservesFocusGaps = (2 * (maxWidth - 2 * config.sideMargin - 8)) / (cardCount + 3)
  return Math.min(config.cardWidth, maxWidth, widthThatPreservesFocusGaps)
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
  const focusPositions = createFocusPositions(cardCount, left, right, cardWidth, config)
  const restPositions = positionsForFocus(focusPositions, cardCount - 1, cardWidth)
  const rects: ReviewCardRect[] = []

  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    const type = cardIndex % 2 === 0 ? "state" : "transition"
    const center = restPositions[cardIndex]!
    rects.push({
      type,
      index: type === "state" ? cardIndex / 2 : (cardIndex - 1) / 2,
      cardIndex,
      baseLeft: center - cardWidth / 2,
      baseRight: center + cardWidth / 2,
    })
  }

  return rects
}

export function focusCardIndexAtX(
  cardCount: number,
  left: number,
  right: number,
  x: number,
  config = DEFAULT_REVIEW_CARD_CONFIG,
): number {
  if (cardCount <= 1) return 0
  const cardWidth = Math.min(config.cardWidth, right - left)
  const focusPositions = createFocusPositions(cardCount, left, right, cardWidth, config)
  const clampedX = clamp(x, focusPositions[0]!, focusPositions.at(-1)!)

  return focusPositions.reduce((nearest, position, index) => {
    return Math.abs(position - clampedX) < Math.abs(focusPositions[nearest]! - clampedX) ? index : nearest
  }, 0)
}

export function layoutReviewCards(
  rects: readonly ReviewCardRect[],
  restFocusCardIndex: number,
  pointerX: number | undefined,
  left: number,
  right: number,
  config = DEFAULT_REVIEW_CARD_CONFIG,
): ReviewCardLayout[] {
  if (rects.length === 0) return []

  const cardWidth = rects[0]!.baseRight - rects[0]!.baseLeft
  const focusPositions = createFocusPositions(rects.length, left, right, cardWidth, config)
  const restFocus = clampIndex(restFocusCardIndex, rects.length)

  if (pointerX === undefined) {
    return makeLayouts(rects, positionsForFocus(focusPositions, restFocus, cardWidth), 0, cardWidth)
  }

  const clampedX = clamp(pointerX, focusPositions[0]!, focusPositions.at(-1)!)
  const upperIndex = focusPositions.findIndex((position) => position >= clampedX)
  const upper = upperIndex === -1 ? focusPositions.length - 1 : upperIndex
  const lower = Math.max(0, upper - 1)
  const span = focusPositions[upper]! - focusPositions[lower]!
  const amount = span === 0 ? 0 : (clampedX - focusPositions[lower]!) / span
  const lowerPositions = positionsForFocus(focusPositions, lower, cardWidth)
  const upperPositions = positionsForFocus(focusPositions, upper, cardWidth)
  const positions = lowerPositions.map((position, index) => position + (upperPositions[index]! - position) * amount)
  const continuousFocus = lower + amount

  return makeLayouts(rects, positions, continuousFocus, cardWidth)
}

function createFocusPositions(
  cardCount: number,
  left: number,
  right: number,
  cardWidth: number,
  config: ReviewCardConfig,
): number[] {
  const shift = sideShiftForCardWidth(cardWidth)
  const first = left + cardWidth / 2 + config.sideMargin + shift
  const last = right - cardWidth / 2 - config.sideMargin - shift
  if (cardCount <= 1) return [(first + last) / 2]

  // Keep a small overlap at rest even for short paths. Longer paths naturally
  // pack more tightly as the available width is shared by more focus points.
  const advance = Math.min(cardWidth / 2, (last - first) / (cardCount - 1))
  const span = advance * (cardCount - 1)
  const start = (left + right - span) / 2
  return Array.from({ length: cardCount }, (_value, index) => start + index * advance)
}

function positionsForFocus(focusPositions: readonly number[], focusIndex: number, cardWidth: number): number[] {
  const shift = sideShiftForCardWidth(cardWidth)
  return focusPositions.map((position, index) => {
    if (index < focusIndex) return position - shift
    if (index > focusIndex) return position + shift
    return position
  })
}

function sideShiftForCardWidth(cardWidth: number): number {
  return cardWidth / 2 + 4
}

function makeLayouts(
  rects: readonly ReviewCardRect[],
  centers: readonly number[],
  continuousFocus: number,
  cardWidth: number,
): ReviewCardLayout[] {
  return rects.map((rect, index) => {
    const center = centers[index]!
    return {
      ...rect,
      left: center - cardWidth / 2,
      right: center + cardWidth / 2,
      width: cardWidth,
      center,
      verticalInfluence: clamp(1 - Math.abs(index - continuousFocus), 0, 1),
    }
  })
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length - 1, index))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
