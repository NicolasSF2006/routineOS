import { NextResponse } from "next/server"
import {
  createMentorProviderStatusReply,
  createMentorReply,
} from "@/features/mentor/server/mentor-provider-router"
import {
  isObject,
  sanitizeMentorContext,
  sanitizeMentorHistory,
  sanitizeMentorMessage,
} from "@/features/mentor/server/mentor-request-validation"
import { readJsonBody } from "@/server/http/read-json-body"
import {
  checkRateLimit,
  getRequestClientKey,
} from "@/server/security/rate-limit"

export const dynamic = "force-dynamic"

const MAX_REQUEST_BYTES = 64_000
const MAX_HISTORY_ITEMS = 20
const MAX_HISTORY_CONTENT_LENGTH = 2_000
const RATE_LIMIT_REQUESTS = 30
const RATE_LIMIT_WINDOW_MS = 60_000

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers })
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `mentor:${getRequestClientKey(request)}`,
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return jsonError(
      "Muitas mensagens foram enviadas em pouco tempo. Aguarde um instante e tente novamente.",
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    )
  }

  const parsedBody = await readJsonBody(request, MAX_REQUEST_BYTES)
  if (!parsedBody.ok) {
    return jsonError(
      parsedBody.reason === "payload-too-large"
        ? "A mensagem enviada é muito grande."
        : "Envie uma mensagem válida para o Mentor IA.",
      parsedBody.reason === "payload-too-large" ? 413 : 400,
    )
  }

  if (!isObject(parsedBody.value)) {
    return jsonError("Envie uma mensagem válida para o Mentor IA.", 400)
  }

  const message = sanitizeMentorMessage(parsedBody.value.message)
  const context = sanitizeMentorContext(parsedBody.value.context)

  if (!message) return jsonError("A mensagem não pode ficar vazia.", 400)
  if (!context) {
    return jsonError("Não foi possível ler o contexto do RoutineOS.", 400)
  }

  const mentorRequest = {
    message,
    history: sanitizeMentorHistory(parsedBody.value.history, {
      maximumItems: MAX_HISTORY_ITEMS,
      maximumContentLength: MAX_HISTORY_CONTENT_LENGTH,
      includeActions: true,
    }),
    context,
  }

  const response =
    message.toLowerCase() === "/provedores"
      ? await createMentorProviderStatusReply(mentorRequest)
      : await createMentorReply(mentorRequest)

  return NextResponse.json(response)
}
