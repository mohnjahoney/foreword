type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface EventEnvelope {
  id: string
  projectId: string
  source: string
  type: string
  time: string
  payload: JsonValue
}

export function createEventEnvelope(input: {
  projectId: string
  source: string
  id: string
  type: string
  time: string
  payload: JsonValue
}): EventEnvelope {
  return {
    id: input.id,
    projectId: input.projectId,
    source: input.source,
    type: input.type,
    time: input.time,
    payload: input.payload,
  }
}
