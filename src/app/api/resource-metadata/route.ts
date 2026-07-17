import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { NextResponse } from "next/server"
import { readJsonBody } from "@/server/http/read-json-body"
import {
  checkRateLimit,
  getRequestClientKey,
} from "@/server/security/rate-limit"

const MAX_REQUEST_BYTES = 4_096
const MAX_HTML_BYTES = 250_000
const FETCH_TIMEOUT_MS = 5_000
const MAX_REDIRECTS = 3
const RATE_LIMIT_REQUESTS = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return true
  const [first, second] = parts

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  )
}

export function isPrivateIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0]
  const version = isIP(normalized)
  if (version === 4) return isPrivateIpv4(normalized)
  if (version !== 6) return true

  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice("::ffff:".length))
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8:")
  )
}

async function assertPublicUrl(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase()
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("URL não permitida.")
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIpAddress(address))
  ) {
    throw new Error("URL não permitida.")
  }
}

function extractMetaContent(html: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const metaPattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`,
    "i",
  )
  const match = html.match(metaPattern)
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? "") : null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (!match?.[1]) return null
  const title = decodeHtmlEntities(match[1])
  if (!title) return null
  const [firstPart] = title.split(/\s+[|–—-]\s+/)
  return firstPart?.trim() || title
}

function extractPlatformFromHtml(html: string): string | null {
  return (
    [
      extractMetaContent(html, "og:site_name"),
      extractMetaContent(html, "application-name"),
      extractMetaContent(html, "apple-mobile-web-app-title"),
      extractMetaContent(html, "twitter:app:name:iphone"),
      extractTitle(html),
    ].find((item) => item && item.length >= 2 && item.length <= 80) ?? null
  )
}

const PLATFORM_HOSTNAME_ALIASES = [
  ["alura.com.br", "Alura"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["udemy.com", "Udemy"],
  ["coursera.org", "Coursera"],
  ["edx.org", "edX"],
  ["rocketseat.com.br", "Rocketseat"],
  ["dio.me", "DIO"],
  ["freecodecamp.org", "freeCodeCamp"],
  ["cursoemvideo.com", "Curso em Vídeo"],
  ["web.dev", "web.dev"],
  ["figma.com", "Figma"],
] as const

function getFriendlyPlatformFromHostname(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/^www\./, "")
  return (
    PLATFORM_HOSTNAME_ALIASES.find(
      ([candidate]) =>
        normalized === candidate || normalized.endsWith(`.${candidate}`),
    )?.[1] ?? null
  )
}

function getDomainFallback(url: URL): string {
  return (
    getFriendlyPlatformFromHostname(url.hostname) ??
    url.hostname.replace(/^www\./, "")
  )
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES)
    return ""
  if (!response.body) return ""

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_HTML_BYTES) {
      await reader.cancel()
      return ""
    }
    chunks.push(value)
  }

  const merged = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

async function fetchPublicHtml(
  initialUrl: URL,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = initialUrl

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertPublicUrl(currentUrl)
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": "RoutineOS metadata reader",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get("location")
    if (!location || redirectCount === MAX_REDIRECTS) {
      throw new Error("Redirecionamento inválido.")
    }
    currentUrl = new URL(location, currentUrl)
    if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
      throw new Error("Redirecionamento inválido.")
    }
  }

  throw new Error("Redirecionamentos em excesso.")
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `resource-metadata:${getRequestClientKey(request)}`,
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Muitas consultas de metadados foram solicitadas. Aguarde e tente novamente.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  const parsedBody = await readJsonBody(request, MAX_REQUEST_BYTES)
  const body =
    parsedBody.ok && typeof parsedBody.value === "object" && parsedBody.value
      ? (parsedBody.value as { url?: unknown })
      : null
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : ""

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 })
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Use uma URL com http ou https." },
      { status: 400 },
    )
  }

  const fallback = getDomainFallback(parsedUrl)
  const hostnameAlias = getFriendlyPlatformFromHostname(parsedUrl.hostname)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetchPublicHtml(parsedUrl, controller.signal)
    const contentType = response.headers.get("content-type") ?? ""
    if (!response.ok || !contentType.includes("text/html")) {
      return NextResponse.json({ platform: fallback, source: "domain" })
    }

    const html = await readLimitedText(response)
    const platform = html ? extractPlatformFromHtml(html) : null
    const resolvedPlatform = hostnameAlias ?? platform ?? fallback
    const source = hostnameAlias
      ? "domain-alias"
      : platform
        ? "metadata"
        : "domain"
    return NextResponse.json({ platform: resolvedPlatform, source })
  } catch (error) {
    if (error instanceof Error && error.message === "URL não permitida.") {
      return NextResponse.json({ error: "URL não permitida." }, { status: 400 })
    }
    return NextResponse.json({ platform: fallback, source: "domain" })
  } finally {
    clearTimeout(timeout)
  }
}
