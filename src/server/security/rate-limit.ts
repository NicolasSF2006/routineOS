import { createHash } from "node:crypto"
import { isIP } from "node:net"

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export interface RateLimitAttempt {
  key: string
  limit: number
  windowMs: number
  now?: number
}

export interface RateLimitStore {
  consume(attempt: RateLimitAttempt): RateLimitResult
  reset(): void
  readonly size: number
}

export interface RequestClientIdentificationOptions {
  /** Endereço obtido diretamente do socket/runtime, nunca de um header HTTP. */
  directAddress?: string | null
  /** Quantidade de proxies controlados entre a aplicação e o cliente. */
  trustedProxyHops?: number
}

const MAX_TRACKED_CLIENTS = 10_000

export function normalizeIpAddress(value: string): string | null {
  let candidate = value.trim().toLowerCase().split("%")[0] ?? ""
  if (!candidate) return null

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"))
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"))
  }

  const version = isIP(candidate)
  if (version === 4) return candidate
  if (version !== 6) return null

  try {
    return new URL(`http://[${candidate}]`).hostname.slice(1, -1)
  } catch {
    return null
  }
}

function configuredTrustedProxyHops(): number {
  const rawValue = process.env.RATE_LIMIT_TRUST_PROXY_HOPS
  if (!rawValue || !/^\d+$/.test(rawValue)) return 0
  const value = Number(rawValue)
  return Number.isSafeInteger(value) ? Math.min(value, 10) : 0
}

function getTrustedForwardedAddress(
  request: Request,
  trustedProxyHops: number,
): string | null {
  if (trustedProxyHops <= 0) return null

  const forwardedAddresses = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map(normalizeIpAddress)
    .filter((address): address is string => address !== null)

  if (forwardedAddresses.length >= trustedProxyHops) {
    return (
      forwardedAddresses[forwardedAddresses.length - trustedProxyHops] ?? null
    )
  }

  return normalizeIpAddress(request.headers.get("x-real-ip") ?? "")
}

function createFallbackFingerprint(request: Request): string {
  const signals = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua") ?? "",
    request.headers.get("sec-ch-ua-platform") ?? "",
  ]
    .map((value) => value.slice(0, 512))
    .join("\n")

  return createHash("sha256")
    .update(signals || "sem-sinais")
    .digest("hex")
}

export function getRequestClientKey(
  request: Request,
  options: RequestClientIdentificationOptions = {},
): string {
  const directAddress = normalizeIpAddress(options.directAddress ?? "")
  if (directAddress) return `ip:${directAddress}`

  const trustedProxyHops =
    options.trustedProxyHops ?? configuredTrustedProxyHops()
  const forwardedAddress = getTrustedForwardedAddress(request, trustedProxyHops)
  if (forwardedAddress) return `ip:${forwardedAddress}`

  return `fallback:${createFallbackFingerprint(request)}`
}

export function createInMemoryRateLimitStore({
  maximumBuckets = MAX_TRACKED_CLIENTS,
}: {
  maximumBuckets?: number
} = {}): RateLimitStore {
  if (!Number.isSafeInteger(maximumBuckets) || maximumBuckets < 1) {
    throw new Error("O limite de buckets deve ser um inteiro positivo.")
  }

  const entries = new Map<string, RateLimitEntry>()

  function removeExpiredEntries(now: number): void {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key)
    }
  }

  function makeRoomForNewBucket(now: number): void {
    if (entries.size < maximumBuckets) return
    removeExpiredEntries(now)
    if (entries.size < maximumBuckets) return

    const leastRecentlyUsedKey = entries.keys().next().value as
      string | undefined
    if (leastRecentlyUsedKey !== undefined) entries.delete(leastRecentlyUsedKey)
  }

  return {
    consume({ key, limit, windowMs, now = Date.now() }) {
      if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error("O limite de requisições deve ser um inteiro positivo.")
      }
      if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error("A janela do rate limit deve ser positiva.")
      }

      const current = entries.get(key)
      if (!current) makeRoomForNewBucket(now)

      const activeEntry = entries.get(key)
      const entry =
        !activeEntry || activeEntry.resetAt <= now
          ? { count: 0, resetAt: now + windowMs }
          : activeEntry

      entry.count += 1
      // A ordem de inserção do Map representa o uso recente. Recolocar o
      // bucket existente no final mantém a eviction em tempo constante.
      if (activeEntry) entries.delete(key)
      entries.set(key, entry)

      return {
        allowed: entry.count <= limit,
        limit,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((entry.resetAt - now) / 1_000),
        ),
      }
    },
    reset() {
      entries.clear()
    },
    get size() {
      return entries.size
    },
  }
}

const defaultStore = createInMemoryRateLimitStore()

export function checkRateLimit(attempt: RateLimitAttempt): RateLimitResult {
  return defaultStore.consume(attempt)
}

export function resetRateLimits(): void {
  defaultStore.reset()
}
