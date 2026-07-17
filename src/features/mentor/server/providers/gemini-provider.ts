import { fetchMentorProvider } from "@/features/mentor/server/provider-http-client"
import {
  createContextMessage,
  MAX_MENTOR_OUTPUT_TOKENS,
  MENTOR_SYSTEM_PROMPT,
  type MentorProviderRequest,
} from "@/features/mentor/server/mentor-prompts"

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

const GEMINI_API_VERSION = "v1beta"
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"

type GeminiContent = {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

function buildGeminiContents({
  message,
  history,
  context,
}: MentorProviderRequest): GeminiContent[] {
  return [
    {
      role: "user",
      parts: [{ text: createContextMessage(context) }],
    },
    ...history.map((item): GeminiContent => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ]
}

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return null

  const textParts: string[] = []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue

    const content = (candidate as { content?: unknown }).content
    if (!content || typeof content !== "object") continue

    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue

    for (const part of parts) {
      if (!part || typeof part !== "object") continue

      const maybeText = (part as { text?: unknown }).text
      if (typeof maybeText === "string" && maybeText.trim().length > 0) {
        textParts.push(maybeText.trim())
      }
    }
  }

  return textParts.length > 0 ? textParts.join("\n\n") : null
}

export async function createGeminiMentorReply({
  apiKey,
  model,
  request,
}: {
  apiKey: string
  model: string
  request: MentorProviderRequest
}): Promise<string> {
  const endpoint = `${GEMINI_BASE_URL}/${GEMINI_API_VERSION}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetchMentorProvider("gemini", endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: MENTOR_SYSTEM_PROMPT }],
      },
      contents: buildGeminiContents(request),
      generationConfig: {
        maxOutputTokens: MAX_MENTOR_OUTPUT_TOKENS,
        temperature: 0.35,
      },
    }),
  })

  const payload = (await response.json()) as unknown
  const reply = extractGeminiText(payload)

  if (!reply) {
    throw new Error("A resposta do Gemini veio vazia.")
  }

  return reply
}
