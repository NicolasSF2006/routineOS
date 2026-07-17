import { NextResponse } from "next/server"
import { createMentorReply } from "@/features/mentor/server/mentor-provider-router"
import {
  isObject,
  sanitizeMentorContext,
  sanitizeMentorHistory,
} from "@/features/mentor/server/mentor-request-validation"
import {
  applyMentorStudyTrailPlan,
  createLocalStudyTrailReply,
  createStudyTrailFromContext,
  createStudyTrailPrompt,
} from "@/features/mentor/utils/study-trail"
import { readJsonBody } from "@/server/http/read-json-body"
import {
  checkRateLimit,
  getRequestClientKey,
} from "@/server/security/rate-limit"
import type { StudyTrailApiResponse } from "@/features/mentor/types"

export const dynamic = "force-dynamic"

const MAX_REQUEST_BYTES = 64_000
const MAX_HISTORY_ITEMS = 12
const MAX_HISTORY_CONTENT_LENGTH = 1_500
const RATE_LIMIT_REQUESTS = 12
const RATE_LIMIT_WINDOW_MS = 60_000

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers })
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `mentor-trail:${getRequestClientKey(request)}`,
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return jsonError(
      "Muitas trilhas foram solicitadas em pouco tempo. Aguarde e tente novamente.",
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    )
  }

  const parsedBody = await readJsonBody(request, MAX_REQUEST_BYTES)
  if (!parsedBody.ok || !isObject(parsedBody.value)) {
    return jsonError(
      parsedBody.ok
        ? "Não foi possível gerar a trilha agora."
        : parsedBody.reason === "payload-too-large"
          ? "Os dados enviados são muito grandes."
          : "Não foi possível gerar a trilha agora.",
      !parsedBody.ok && parsedBody.reason === "payload-too-large" ? 413 : 400,
    )
  }

  const context = sanitizeMentorContext(parsedBody.value.context)
  if (!context) {
    return jsonError(
      "Não foi possível ler o contexto da rotina para montar a trilha.",
      400,
    )
  }

  const trail = createStudyTrailFromContext(context)
  if (trail.topics.length === 0) {
    return jsonError(
      "Crie pelo menos um bloco de estudo na rotina antes de gerar uma trilha.",
      400,
    )
  }

  const response = await createMentorReply({
    message: createStudyTrailPrompt(trail),
    history: sanitizeMentorHistory(parsedBody.value.history, {
      maximumItems: MAX_HISTORY_ITEMS,
      maximumContentLength: MAX_HISTORY_CONTENT_LENGTH,
    }),
    context,
  })

  const structuredTrailAction =
    response.action?.type === "propose-study-trail" ? response.action : null
  const enrichedTrail = structuredTrailAction
    ? applyMentorStudyTrailPlan(trail, structuredTrailAction.trail)
    : trail
  const reply = structuredTrailAction
    ? response.reply
    : createLocalStudyTrailReply(enrichedTrail)

  const payload: StudyTrailApiResponse = {
    trail: {
      ...enrichedTrail,
      mentorNotes: enrichedTrail.mentorNotes || reply,
      providerMode: response.mode,
    },
    reply,
    mode: response.mode,
  }

  return NextResponse.json(payload)
}
