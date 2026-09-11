import { createHeadlessGame, type HeadlessAnalyticsSink } from "../src/analytics/headless.ts"
import { createEventEnvelope, type JsonValue } from "../src/analytics/protocol.ts"

const endpoint = "https://analytics-receiver.mohnjahoney.chatgpt.site/api/events"
const password = process.env.TRACKER_CURL_PASSWORD

if (!password) throw new Error("Set TRACKER_CURL_PASSWORD before running the live analytics smoke test.")

const requests: Promise<Response>[] = []
const analytics: HeadlessAnalyticsSink = {
  track(type: string, payload: Record<string, JsonValue>) {
    const envelope = createEventEnvelope({
      id: crypto.randomUUID(),
      projectId: "foreword",
      source: "foreword",
      type,
      time: new Date().toISOString(),
      payload,
    })
    requests.push(fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${password}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events: [envelope] }),
    }))
  },
}

const first = createHeadlessGame({ randomSeed: 13579, analytics })
first.selectTile(0)
first.selectTile(1)
first.selectTile(2)
first.selectTile(3)
first.reset()

const second = createHeadlessGame({ randomSeed: 24680, analytics })
second.selectTile(0)
second.selectTile(1)
second.selectTile(4)
second.selectTile(5)

const responses = await Promise.all(requests)
const failures = responses.filter((response) => !response.ok)
if (failures.length > 0) {
  const details = await Promise.all(failures.map(async (response) => `${response.status}: ${await response.text()}`))
  throw new Error(`Live analytics smoke test failed: ${details.join("; ")}`)
}

console.log(`Sent ${responses.length} analytics events from 2 headless sessions.`)
