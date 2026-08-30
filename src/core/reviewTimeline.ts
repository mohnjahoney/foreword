export type MagnificationMode = "center" | "continuous"
export type TimelineRectType = "state" | "transition"

export interface MagnificationConfig {
  radius: number
  restStateWidth: number
  restTransitionWidth: number
  focusedWidth: number
  baseHeight: number
  maxHeightScale: number
  maxVerticalDisplacement: number
  smoothing: number
}

export interface TimelineRect {
  type: TimelineRectType
  index: number
  baseLeft: number
  baseRight: number
  delta?: number
}

export interface LaidOutTimelineRect extends TimelineRect {
  left: number
  right: number
  width: number
  center: number
  influence: number
  height: number
}

export const DEFAULT_MAGNIFICATION_CONFIG: MagnificationConfig = {
  radius: 30,
  restStateWidth: 4,
  restTransitionWidth: 24,
  focusedWidth: 18,
  baseHeight: 14,
  maxHeightScale: 2.2,
  maxVerticalDisplacement: 16,
  smoothing: 0.22,
}

export function influenceAt(x: number, mouseX: number, radius: number): number {
  const distance = Math.abs(x - mouseX)
  if (distance >= radius) return 0
  return (1 + Math.cos(Math.PI * distance / radius)) / 2
}

export function widthAt(type: TimelineRectType, influence: number, config: MagnificationConfig): number {
  const restWidth = type === "state" ? config.restStateWidth : config.restTransitionWidth
  return lerp(restWidth, config.focusedWidth, influence)
}

export function heightAtInfluence(influence: number, config: MagnificationConfig): number {
  return config.baseHeight * lerp(1, config.maxHeightScale, influence)
}

export function createTimelineRects(stateCount: number, left: number, availableWidth: number, config = DEFAULT_MAGNIFICATION_CONFIG): TimelineRect[] {
  if (stateCount <= 0) return []
  const transitionCount = Math.max(0, stateCount - 1)
  const transitionWidth = transitionCount === 0
    ? 0
    : Math.max(config.restTransitionWidth, (availableWidth - stateCount * config.restStateWidth) / transitionCount)
  const totalWidth = stateCount * config.restStateWidth + transitionCount * transitionWidth
  const scale = totalWidth > availableWidth ? availableWidth / totalWidth : 1
  const stateWidth = config.restStateWidth * scale
  const scaledTransitionWidth = transitionWidth * scale
  const rects: TimelineRect[] = []
  let cursor = left
  for (let index = 0; index < stateCount; index += 1) {
    rects.push({ type: "state", index, baseLeft: cursor, baseRight: cursor + stateWidth })
    cursor += stateWidth
    if (index < transitionCount) {
      rects.push({ type: "transition", index, baseLeft: cursor, baseRight: cursor + scaledTransitionWidth })
      cursor += scaledTransitionWidth
    }
  }
  return rects
}

export function averageInfluenceAcrossInterval(left: number, right: number, mouseX: number, radius: number): number {
  const sampleCount = 5
  let total = 0
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const fraction = (sample + 0.5) / sampleCount
    total += influenceAt(left + (right - left) * fraction, mouseX, radius)
  }
  return total / sampleCount
}

export function layoutTimelineRects(
  rects: readonly TimelineRect[],
  mouseX: number | undefined,
  availableLeft: number,
  availableRight: number,
  mode: MagnificationMode,
  config = DEFAULT_MAGNIFICATION_CONFIG,
): LaidOutTimelineRect[] {
  if (rects.length === 0) return []
  const influences = rects.map((rect) => {
    if (mouseX === undefined) return 0
    return mode === "center"
      ? influenceAt((rect.baseLeft + rect.baseRight) / 2, mouseX, config.radius)
      : averageInfluenceAcrossInterval(rect.baseLeft, rect.baseRight, mouseX, config.radius)
  })
  const widths = rects.map((rect, index) => widthAt(rect.type, influences[index]!, config))
  const laidOut: LaidOutTimelineRect[] = []
  let cursor = rects[0]!.baseLeft
  rects.forEach((rect, index) => {
    const width = widths[index]!
    laidOut.push({
      ...rect,
      left: cursor,
      right: cursor + width,
      width,
      center: cursor + width / 2,
      influence: influences[index]!,
      height: heightAtInfluence(influences[index]!, config),
    })
    cursor += width
  })

  if (mouseX !== undefined) {
    const baseFocus = clamp(mouseX, availableLeft, availableRight)
    const focusRect = rects.findIndex((rect) => baseFocus >= rect.baseLeft && baseFocus <= rect.baseRight)
    const focusIndex = focusRect >= 0 ? focusRect : nearestRectIndex(rects, baseFocus)
    const source = rects[focusIndex]!
    const result = laidOut[focusIndex]!
    const sourceFraction = source.baseRight === source.baseLeft ? 0.5 : clamp((baseFocus - source.baseLeft) / (source.baseRight - source.baseLeft), 0, 1)
    const transformedFocus = result.left + result.width * sourceFraction
    const unclampedShift = baseFocus - transformedFocus
    const minShift = availableLeft - laidOut[0]!.left
    const maxShift = availableRight - laidOut.at(-1)!.right
    const shift = clamp(unclampedShift, minShift, maxShift)
    laidOut.forEach((rect) => {
      rect.left += shift
      rect.right += shift
      rect.center += shift
    })
  }
  return laidOut
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function nearestRectIndex(rects: readonly TimelineRect[], x: number): number {
  return rects.reduce((nearest, rect, index) => {
    const nearestDistance = distanceToRect(rects[nearest]!, x)
    const distance = distanceToRect(rect, x)
    return distance < nearestDistance ? index : nearest
  }, 0)
}

function distanceToRect(rect: TimelineRect, x: number): number {
  if (x < rect.baseLeft) return rect.baseLeft - x
  if (x > rect.baseRight) return x - rect.baseRight
  return 0
}
