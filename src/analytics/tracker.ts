export const TRACKER_ENDPOINT = "https://public-data-receiver-test.mohnjahoney.chatgpt.site/api/events"

type AnalyticsDetails = Record<string, unknown>

const sessionId = createAnalyticsId()
let sessionStarted = false
let puzzleNumber = 0

export function trackSessionStarted(): void {
  if (sessionStarted) return
  sessionStarted = true
  trackForewordEvent("foreword:session_started", { platform: "web" })
}

export function startPuzzleAnalytics(): { puzzleId: string; puzzleNumber: number } {
  puzzleNumber += 1
  return { puzzleId: createAnalyticsId(), puzzleNumber }
}

export function trackForewordEvent(event: string, details: AnalyticsDetails = {}): void {
  void fetch(TRACKER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      message: event,
      eventId: createAnalyticsId(),
      sessionId,
      occurredAt: new Date().toISOString(),
      ...details,
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt or alter gameplay.
  })
}

function createAnalyticsId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
