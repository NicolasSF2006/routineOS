import { createMockMentorReply } from "@/features/mentor/server/openai-mentor"
import { normalizeProviderError } from "@/features/mentor/server/provider-error"
import type { MentorProviderError } from "@/features/mentor/server/provider-error"
import { parseMentorProviderResponse } from "@/features/mentor/server/mentor-response"
import { recordMentorEvent } from "@/features/mentor/server/mentor-observability"
import { readMentorEnvironment } from "@/features/mentor/server/mentor-environment"
import {
  findLatestRoutinePreview,
  isExplicitRoutineConfirmation,
} from "@/features/mentor/utils/mentor-routine-proposal"
import {
  checkGeminiProviderAvailability,
  createGeminiMentorReply,
  DEFAULT_GEMINI_MODEL,
} from "@/features/mentor/server/providers/gemini-provider"
import {
  checkGroqProviderAvailability,
  createGroqMentorReply,
  DEFAULT_GROQ_MODEL,
} from "@/features/mentor/server/providers/groq-provider"
import {
  checkOpenAIProviderAvailability,
  createOpenAIMentorReply,
  DEFAULT_OPENAI_MODEL,
} from "@/features/mentor/server/providers/openai-provider"
import {
  checkOpenRouterProviderAvailability,
  createOpenRouterMentorReply,
  DEFAULT_OPENROUTER_MODEL,
} from "@/features/mentor/server/providers/openrouter-provider"
import type { MentorApiResponse } from "@/features/mentor/types"
import type { MentorProviderRequest } from "@/features/mentor/server/mentor-prompts"

export type MentorProviderName = "gemini" | "groq" | "openrouter" | "openai"

type MentorProviderConfig = {
  name: MentorProviderName
  apiKey?: string
  model: string
  createReply: (args: {
    apiKey: string
    model: string
    request: MentorProviderRequest
  }) => Promise<string>
  checkAvailability: (args: { apiKey: string; model: string }) => Promise<void>
}

type ProviderCooldown = {
  until: number
  reason: string
}

const DEFAULT_PROVIDER_ORDER: MentorProviderName[] = [
  "gemini",
  "groq",
  "openrouter",
  "openai",
]
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000
const DEFAULT_SERVER_ERROR_COOLDOWN_MS = 30_000
const MAX_STRUCTURED_RESPONSE_ATTEMPTS = 2
const providerCooldowns = new Map<MentorProviderName, ProviderCooldown>()

function createCompactStructuredRetryRequest(
  request: MentorProviderRequest,
): MentorProviderRequest {
  return {
    ...request,
    message: [
      request.message,
      "",
      "INSTRUÇÃO TÉCNICA DE RECUPERAÇÃO:",
      "A resposta estruturada anterior ficou truncada ou inválida.",
      "Gere novamente um único JSON válido e compacto, sem texto fora do objeto.",
      "Se for Pomodoro, inclua em blocks somente type e title dos focos study/project; omita pausas, startTime, durationMinutes e descriptions longas.",
      "Se for GERAR_TRILHA_ESTRUTURADA, mantenha propose-study-trail, use no máximo 4 passos curtos por tema e somente IDs permitidos.",
      "Agrupe dias iguais no mesmo schedule e não repita informações.",
    ].join("\n"),
  }
}

function getPreferredProvider(): MentorProviderName | "auto" {
  return readMentorEnvironment().provider
}

function createProviderOrder(): MentorProviderName[] {
  const preferredProvider = getPreferredProvider()

  return preferredProvider === "auto"
    ? DEFAULT_PROVIDER_ORDER
    : [preferredProvider]
}

function createProviderConfigs(): Record<
  MentorProviderName,
  MentorProviderConfig
> {
  const environment = readMentorEnvironment()

  return {
    gemini: {
      name: "gemini",
      apiKey: environment.providers.gemini.apiKey,
      model: environment.providers.gemini.model || DEFAULT_GEMINI_MODEL,
      createReply: createGeminiMentorReply,
      checkAvailability: checkGeminiProviderAvailability,
    },
    groq: {
      name: "groq",
      apiKey: environment.providers.groq.apiKey,
      model: environment.providers.groq.model || DEFAULT_GROQ_MODEL,
      createReply: createGroqMentorReply,
      checkAvailability: checkGroqProviderAvailability,
    },
    openrouter: {
      name: "openrouter",
      apiKey: environment.providers.openrouter.apiKey,
      model: environment.providers.openrouter.model || DEFAULT_OPENROUTER_MODEL,
      createReply: createOpenRouterMentorReply,
      checkAvailability: checkOpenRouterProviderAvailability,
    },
    openai: {
      name: "openai",
      apiKey: environment.providers.openai.apiKey,
      model: environment.providers.openai.model || DEFAULT_OPENAI_MODEL,
      createReply: createOpenAIMentorReply,
      checkAvailability: checkOpenAIProviderAvailability,
    },
  }
}

function getProviderFailureReason(error: MentorProviderError): string {
  const providerSignal = [error.providerErrorCode, error.providerErrorType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (error.status === 401) return "chave inválida ou sem autorização"
  if (error.status === 403) return "acesso negado pelo provedor"
  if (error.status === 404) return "modelo ou endpoint não encontrado"
  if (error.status === 413) return "solicitação recusada por tamanho"

  if (error.status === 429) {
    if (/insufficient_quota|billing|credit|quota/.test(providerSignal)) {
      return "cota ou créditos indisponíveis"
    }

    if (/rate.?limit|tokens|requests/.test(providerSignal)) {
      return "limite temporário de requisições"
    }

    return "limite ou cota da API atingidos"
  }

  if (error.status && error.status >= 500) {
    return "falha temporária do provedor"
  }

  if (error.message.toLowerCase().includes("tempo limite")) {
    return "tempo limite de resposta excedido"
  }

  return "falha ao validar o provedor"
}

function getActiveCooldown(
  provider: MentorProviderName,
): ProviderCooldown | null {
  const cooldown = providerCooldowns.get(provider)
  if (!cooldown) return null

  if (cooldown.until <= Date.now()) {
    providerCooldowns.delete(provider)
    return null
  }

  return cooldown
}

function getCooldownDuration(error: MentorProviderError): number | null {
  if (!error.retryable) return null
  if (error.retryAfterMs !== undefined)
    return Math.max(error.retryAfterMs, 1_000)
  if (error.status === 402 || error.status === 429)
    return DEFAULT_RATE_LIMIT_COOLDOWN_MS
  if (error.status && error.status >= 500)
    return DEFAULT_SERVER_ERROR_COOLDOWN_MS
  return null
}

function putProviderOnCooldown(
  provider: MentorProviderName,
  error: MentorProviderError,
): void {
  const duration = getCooldownDuration(error)
  if (!duration) return

  providerCooldowns.set(provider, {
    until: Date.now() + duration,
    reason: error.status ? `HTTP ${error.status}` : "falha temporária",
  })
}

export function resetMentorProviderCooldowns(): void {
  providerCooldowns.clear()
}

export async function createMentorProviderStatusReply(): Promise<MentorApiResponse> {
  const configs = createProviderConfigs()

  const results = await Promise.all(
    DEFAULT_PROVIDER_ORDER.map(async (providerName) => {
      const provider = configs[providerName]

      if (!provider.apiKey) {
        return {
          provider: providerName,
          model: provider.model,
          status: "not-configured" as const,
        }
      }

      const startedAt = Date.now()

      try {
        await provider.checkAvailability({
          apiKey: provider.apiKey,
          model: provider.model,
        })

        providerCooldowns.delete(providerName)
        recordMentorEvent({
          event: "provider-success",
          provider: providerName,
          durationMs: Date.now() - startedAt,
        })

        return {
          provider: providerName,
          model: provider.model,
          status: "available" as const,
          latencyMs: Date.now() - startedAt,
        }
      } catch (error) {
        const normalizedError = normalizeProviderError(providerName, error)
        putProviderOnCooldown(providerName, normalizedError)
        recordMentorEvent({
          event: "provider-failure",
          provider: providerName,
          durationMs: Date.now() - startedAt,
          status: normalizedError.status,
        })

        return {
          provider: providerName,
          model: provider.model,
          status: "unavailable" as const,
          latencyMs: Date.now() - startedAt,
          httpStatus: normalizedError.status,
          reason: getProviderFailureReason(normalizedError),
        }
      }
    }),
  )

  const statusLabels = {
    available: "✅ funcionando",
    unavailable: "❌ indisponível",
    "not-configured": "⚪ não configurado",
  } as const

  const lines = results.map((result) => {
    const latency = "latencyMs" in result ? ` — ${result.latencyMs} ms` : ""
    const httpStatus =
      "httpStatus" in result && result.httpStatus
        ? ` — HTTP ${result.httpStatus}`
        : ""
    const reason =
      "reason" in result && result.reason ? ` — ${result.reason}` : ""

    return `- ${result.provider}: ${statusLabels[result.status]} (${result.model})${latency}${httpStatus}${reason}`
  })

  return {
    reply: [
      "Status dos provedores do Mentor IA:",
      "",
      ...lines,
      "",
      "Este teste envia uma solicitação curta para cada provedor configurado e pode consumir uma pequena parte da cota.",
    ].join("\n"),
    mode: "mock",
  }
}

export async function createMentorReply(
  request: MentorProviderRequest,
): Promise<MentorApiResponse> {
  const latestPreview = findLatestRoutinePreview(request.history)

  if (latestPreview && isExplicitRoutineConfirmation(request.message)) {
    return {
      reply:
        "Perfeito. Reaproveitei exatamente a proposta que você aprovou. Abra o rascunho, revise os blocos e clique em Salvar quando estiver tudo certo.",
      mode: "mock",
      action: {
        type: "propose-routine",
        routine: latestPreview,
      },
    }
  }

  const configs = createProviderConfigs()
  const providerOrder = createProviderOrder()
  const isAutomaticMode = getPreferredProvider() === "auto"
  let configuredProviderCount = 0

  for (const providerName of providerOrder) {
    const provider = configs[providerName]

    if (!provider.apiKey) continue
    configuredProviderCount += 1

    const cooldown = getActiveCooldown(providerName)
    if (isAutomaticMode && cooldown) {
      recordMentorEvent({
        event: "provider-skipped",
        provider: providerName,
        reason: cooldown.reason,
      })
      continue
    }

    const startedAt = Date.now()

    try {
      let providerRequest = request
      let malformedReply =
        "A resposta estruturada da IA chegou incompleta. Tente gerar a prévia novamente."

      for (
        let attempt = 0;
        attempt < MAX_STRUCTURED_RESPONSE_ATTEMPTS;
        attempt += 1
      ) {
        const reply = await provider.createReply({
          apiKey: provider.apiKey,
          model: provider.model,
          request: providerRequest,
        })
        const parsedResponse = parseMentorProviderResponse(reply)

        if (!parsedResponse.malformedStructuredResponse) {
          providerCooldowns.delete(providerName)
          const { malformedStructuredResponse: _ignored, ...response } =
            parsedResponse
          recordMentorEvent({
            event: "provider-success",
            provider: providerName,
            durationMs: Date.now() - startedAt,
          })

          return {
            ...response,
            mode: provider.name,
          }
        }

        malformedReply = parsedResponse.reply
        providerRequest = createCompactStructuredRetryRequest(request)
      }

      providerCooldowns.delete(providerName)
      recordMentorEvent({
        event: "provider-failure",
        provider: providerName,
        durationMs: Date.now() - startedAt,
        reason: "resposta-estruturada-invalida",
      })

      if (!isAutomaticMode) {
        return {
          reply: malformedReply,
          mode: provider.name,
        }
      }

      continue
    } catch (error) {
      const normalizedError = normalizeProviderError(providerName, error)
      putProviderOnCooldown(providerName, normalizedError)
      recordMentorEvent({
        event: "provider-failure",
        provider: providerName,
        durationMs: Date.now() - startedAt,
        status: normalizedError.status,
      })

      if (!isAutomaticMode || !normalizedError.retryable) {
        break
      }
    }
  }

  recordMentorEvent({
    event: "local-fallback",
    reason:
      configuredProviderCount === 0
        ? "nenhum-provedor-configurado"
        : "provedores-indisponiveis",
  })

  return {
    reply: createMockMentorReply(request.message, request.context),
    mode: "mock",
  }
}
