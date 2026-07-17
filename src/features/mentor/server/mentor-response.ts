import {
  formatMentorRoutineProposalPreview,
  normalizeMentorAction,
} from "@/features/mentor/utils/mentor-routine-proposal"
import type { MentorAction } from "@/features/mentor/types"

interface ParsedMentorProviderResponse {
  reply: string
  action?: MentorAction
  malformedStructuredResponse?: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function looksLikeStructuredResponse(rawResponse: string): boolean {
  const trimmed = rawResponse.trim()

  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("```json") ||
    trimmed.includes('"action"') ||
    trimmed.includes('"reply"')
  )
}

function extractJsonCandidate(rawResponse: string): string | null {
  const trimmed = rawResponse.trim()
  if (!trimmed) return null

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  const firstBrace = withoutFence.indexOf("{")
  const lastBrace = withoutFence.lastIndexOf("}")

  if (firstBrace < 0 || lastBrace <= firstBrace) return null
  return withoutFence.slice(firstBrace, lastBrace + 1)
}

function escapeInvalidControlCharactersInsideStrings(value: string): string {
  let result = ""
  let isInsideString = false
  let isEscaped = false

  for (const character of value) {
    if (!isInsideString) {
      result += character

      if (character === '"') {
        isInsideString = true
      }

      continue
    }

    if (isEscaped) {
      result += character
      isEscaped = false
      continue
    }

    if (character === "\\") {
      result += character
      isEscaped = true
      continue
    }

    if (character === '"') {
      result += character
      isInsideString = false
      continue
    }

    if (character === "\n") {
      result += "\\n"
      continue
    }

    if (character === "\r") {
      result += "\\r"
      continue
    }

    if (character === "\t") {
      result += "\\t"
      continue
    }

    if (character === "\b") {
      result += "\\b"
      continue
    }

    if (character === "\f") {
      result += "\\f"
      continue
    }

    const characterCode = character.charCodeAt(0)
    if (characterCode < 0x20) {
      result += `\\u${characterCode.toString(16).padStart(4, "0")}`
      continue
    }

    result += character
  }

  return result
}

function tryParseObject(value: string): Record<string, unknown> | null {
  const repairedValue = escapeInvalidControlCharactersInsideStrings(value)
  const candidates = repairedValue === value ? [value] : [value, repairedValue]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (isObject(parsed)) return parsed
    } catch {
      // Tenta a próxima variação reparada antes de desistir.
    }
  }

  return null
}

function parseJsonResponse(
  rawResponse: string,
): Record<string, unknown> | null {
  const candidate = extractJsonCandidate(rawResponse)
  if (!candidate) return null

  return tryParseObject(candidate)
}

export function parseMentorProviderResponse(
  rawResponse: string,
): ParsedMentorProviderResponse {
  const fallbackReply = rawResponse.trim()
  const parsed = parseJsonResponse(rawResponse)

  if (!parsed) {
    if (looksLikeStructuredResponse(rawResponse)) {
      return {
        reply:
          "A resposta estruturada da IA chegou incompleta. Vou tentar gerar a proposta novamente de forma mais compacta.",
        malformedStructuredResponse: true,
      }
    }

    return {
      reply: fallbackReply || "Não consegui formular uma resposta agora.",
    }
  }

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim().length > 0
      ? parsed.reply.trim().slice(0, 6_000)
      : fallbackReply
  const action =
    parsed.action === null || parsed.action === undefined
      ? null
      : normalizeMentorAction(parsed.action)

  if (parsed.action !== null && parsed.action !== undefined && !action) {
    return {
      reply: [
        reply || "Preparei uma sugestão, mas ela precisa de ajustes.",
        "Não consegui transformar essa proposta em um rascunho válido. Vou tentar gerá-la novamente de forma mais compacta.",
      ].join("\n\n"),
      malformedStructuredResponse: true,
    }
  }

  if (action?.type === "preview-routine") {
    return {
      reply: formatMentorRoutineProposalPreview(action.routine),
      action,
    }
  }

  return {
    reply: reply || "Não consegui formular uma resposta agora.",
    action: action ?? undefined,
  }
}
