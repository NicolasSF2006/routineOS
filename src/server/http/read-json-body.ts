export type ReadJsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid-json" | "payload-too-large" }

export async function readJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<ReadJsonBodyResult> {
  const contentLength = request.headers.get("content-length")
  const declaredLength =
    contentLength && /^\d+$/.test(contentLength) ? Number(contentLength) : null

  if (declaredLength !== null && declaredLength > maximumBytes) {
    return { ok: false, reason: "payload-too-large" }
  }

  if (!request.body) return { ok: false, reason: "invalid-json" }

  const reader = request.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let rawBody = ""
  let receivedBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      receivedBytes += value.byteLength
      if (receivedBytes > maximumBytes) {
        await reader.cancel("payload-too-large")
        return { ok: false, reason: "payload-too-large" }
      }

      rawBody += decoder.decode(value, { stream: true })
    }

    rawBody += decoder.decode()
    return { ok: true, value: JSON.parse(rawBody) as unknown }
  } catch {
    return { ok: false, reason: "invalid-json" }
  } finally {
    reader.releaseLock()
  }
}
