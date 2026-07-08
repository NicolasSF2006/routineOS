import { NextResponse } from "next/server"
import { createMentorReply } from "@/features/mentor/server/mentor-provider-router"
import {
  createStudyTrailFromContext,
  createLocalStudyTrailReply,
  createStudyTrailPrompt,
} from "@/features/mentor/utils/study-trail"
import type { MentorContext, MentorMessage, StudyTrailApiResponse } from "@/features/mentor/types"

export const dynamic = "force-dynamic"

const MAX_HISTORY_ITEMS = 12
const MAX_HISTORY_CONTENT_LENGTH = 1_500
const MAX_CONTEXT_LENGTH = 40_000

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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
        id:
          typeof message.id === "string" && message.id.trim().length > 0
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
    return jsonError("Não foi possível gerar a trilha agora.", 400)
  }

  if (!isObject(body)) {
    return jsonError("Não foi possível gerar a trilha agora.", 400)
  }

  const context = sanitizeContext(body.context)

  if (!context) {
    return jsonError("Não foi possível ler o contexto da rotina para montar a trilha.", 400)
  }

  const trail = createStudyTrailFromContext(context)

  if (trail.topics.length === 0) {
    return jsonError("Crie pelo menos um bloco de estudo na rotina antes de gerar uma trilha.", 400)
  }

  const response = await createMentorReply({
    message: createStudyTrailPrompt(trail),
    history: sanitizeHistory(body.history),
    context,
  })

  const reply = response.mode === "mock" ? createLocalStudyTrailReply(trail) : response.reply
  const trailWithMentorNotes = {
    ...trail,
    mentorNotes: reply,
    providerMode: response.mode,
  }

  const payload: StudyTrailApiResponse = {
    trail: trailWithMentorNotes,
    reply,
    mode: response.mode,
  }

  return NextResponse.json(payload)
}
