import { NextResponse } from "next/server"
import {
  createMockMentorReply,
  createOpenAIMentorReply,
  DEFAULT_OPENAI_MODEL,
} from "@/features/mentor/server/openai-mentor"
import type { MentorApiResponse, MentorContext, MentorMessage } from "@/features/mentor/types"

export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 4_000
const MAX_HISTORY_ITEMS = 20
const MAX_HISTORY_CONTENT_LENGTH = 2_000
const MAX_CONTEXT_LENGTH = 16_000

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sanitizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null

  const message = value.trim()
  if (message.length === 0) return null

  return message.slice(0, MAX_MESSAGE_LENGTH)
}

function sanitizeHistory(rawHistory: unknown): MentorMessage[] {
  if (!Array.isArray(rawHistory)) return []

  return rawHistory
    .slice(-MAX_HISTORY_ITEMS)
    .map((message, index): MentorMessage | null => {
      if (!isObject(message)) return null
      if (message.role !== "user" && message.role !== "assistant") return null
      if (typeof message.content !== "string" || message.content.trim().length === 0) return null

      return {
        id: typeof message.id === "string" && message.id.trim().length > 0
          ? message.id
          : `history-${index + 1}`,
        role: message.role,
        content: message.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH),
        createdAt: typeof message.createdAt === "string" ? message.createdAt : new Date(0).toISOString(),
      }
    })
    .filter((message): message is MentorMessage => message !== null)
}

function sanitizeContext(rawContext: unknown): MentorContext | null {
  if (!isObject(rawContext)) return null

  try {
    const serialized = JSON.stringify(rawContext)
    if (serialized.length > MAX_CONTEXT_LENGTH) return null
  } catch {
    return null
  }

  return rawContext as unknown as MentorContext
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Envie uma mensagem válida para o Mentor IA.", 400)
  }

  if (!isObject(body)) {
    return jsonError("Envie uma mensagem válida para o Mentor IA.", 400)
  }

  const message = sanitizeMessage(body.message)
  const context = sanitizeContext(body.context)

  if (!message) {
    return jsonError("A mensagem não pode ficar vazia.", 400)
  }

  if (!context) {
    return jsonError("Não foi possível ler o contexto do RoutineOS.", 400)
  }

  const history = sanitizeHistory(body.history)
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    const response: MentorApiResponse = {
      reply: createMockMentorReply(message, context),
      mode: "mock",
    }

    return NextResponse.json(response)
  }

  try {
    const reply = await createOpenAIMentorReply({
      apiKey,
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      message,
      history,
      context,
    })
    const response: MentorApiResponse = { reply, mode: "openai" }

    return NextResponse.json(response)
  } catch {
    const response: MentorApiResponse = {
      reply: createMockMentorReply(message, context, "não consegui acessar a API agora"),
      mode: "mock",
    }

    return NextResponse.json(response)
  }
}
