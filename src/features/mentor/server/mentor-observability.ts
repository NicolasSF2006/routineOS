import type { MentorProviderName } from "@/features/mentor/server/mentor-provider-router"

export interface MentorProviderMetrics {
  attempts: number
  successes: number
  failures: number
  totalDurationMs: number
}

export interface MentorObservabilityEvent {
  event:
    | "provider-success"
    | "provider-failure"
    | "provider-skipped"
    | "local-fallback"
  provider?: MentorProviderName
  durationMs?: number
  status?: number
  reason?: string
}

const providerMetrics = new Map<MentorProviderName, MentorProviderMetrics>()

function getMetrics(provider: MentorProviderName): MentorProviderMetrics {
  return (
    providerMetrics.get(provider) ?? {
      attempts: 0,
      successes: 0,
      failures: 0,
      totalDurationMs: 0,
    }
  )
}

export function recordMentorEvent(event: MentorObservabilityEvent): void {
  if (event.provider && event.event !== "provider-skipped") {
    const current = getMetrics(event.provider)
    providerMetrics.set(event.provider, {
      attempts: current.attempts + 1,
      successes:
        current.successes + (event.event === "provider-success" ? 1 : 0),
      failures: current.failures + (event.event === "provider-failure" ? 1 : 0),
      totalDurationMs:
        current.totalDurationMs + Math.max(0, event.durationMs ?? 0),
    })
  }

  const payload = {
    scope: "mentor-ai",
    ...event,
  }

  if (event.event === "provider-failure" || event.event === "local-fallback") {
    console.warn(JSON.stringify(payload))
  } else if (process.env.NODE_ENV !== "test") {
    console.info(JSON.stringify(payload))
  }
}

export function getMentorProviderMetrics(): ReadonlyMap<
  MentorProviderName,
  MentorProviderMetrics
> {
  return new Map(providerMetrics)
}

export function resetMentorObservability(): void {
  providerMetrics.clear()
}
