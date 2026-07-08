import { NextRequest, NextResponse } from "next/server"

const MAX_HTML_CHARS = 250_000
const FETCH_TIMEOUT_MS = 5000

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

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true
  }

  if (/^127\./.test(normalized)) return true
  if (/^10\./.test(normalized)) return true
  if (/^192\.168\./.test(normalized)) return true

  const private172Match = normalized.match(/^172\.(\d+)\./)
  if (private172Match) {
    const secondOctet = Number(private172Match[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }

  return false
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
  const candidates = [
    extractMetaContent(html, "og:site_name"),
    extractMetaContent(html, "application-name"),
    extractMetaContent(html, "apple-mobile-web-app-title"),
    extractMetaContent(html, "twitter:app:name:iphone"),
    extractTitle(html),
  ]

  return candidates.find((item) => item && item.length >= 2 && item.length <= 80) ?? null
}

function getDomainFallback(url: URL): string {
  return url.hostname.replace(/^www\./, "")
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : ""

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 })
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Use uma URL com http ou https." }, { status: 400 })
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return NextResponse.json({ error: "URL não permitida." }, { status: 400 })
  }

  const fallback = getDomainFallback(parsedUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "RoutineOS metadata reader",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    const contentType = response.headers.get("content-type") ?? ""
    if (!response.ok || !contentType.includes("text/html")) {
      return NextResponse.json({ platform: fallback, source: "domain" })
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS)
    const platform = extractPlatformFromHtml(html)

    return NextResponse.json({ platform: platform ?? fallback, source: platform ? "metadata" : "domain" })
  } catch {
    return NextResponse.json({ platform: fallback, source: "domain" })
  } finally {
    clearTimeout(timeout)
  }
}
